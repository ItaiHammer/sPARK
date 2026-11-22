"""Serve the frozen Flint checkpoint using the same features as the lab."""

from functools import cache
import hashlib
import json
import logging
from pathlib import Path

from flask import Flask, jsonify, request
import joblib
import pandas as pd
from threadpoolctl import threadpool_limits

from lab.training.algorithms.flint_opening import adjust_after_clearing, blend_opening_curve
from lab.training.data.preparation import clean_occupancy, observations_for_history, snapshot_inputs
from lab.training.features.history import HISTORY_FEATURES, SLOT_KEYS, history_features
from lab.training.features.time import ZONE


MODEL_DIR = Path(__file__).resolve().parent / "lab/models/flint_v0.3"
DAY_COLUMNS = ["term_type", "phase", "is_instruction_day", "is_holiday"]
SCRAPE_COLUMNS = ["lot_id", "scraped_at", "occupancy_pct", *DAY_COLUMNS]


@cache
def load_model():
    metadata = json.loads((MODEL_DIR / "metadata.json").read_text(encoding="utf-8"))
    model_path = MODEL_DIR / metadata["model_file"]
    with model_path.open("rb") as file:
        if hashlib.file_digest(file, "sha256").hexdigest() != metadata["model_sha256"]:
            raise RuntimeError("Flint checkpoint checksum mismatch.")
    return joblib.load(model_path), metadata["features"]


def predict(payload):
    model, features = load_model()
    issued_at = pd.Timestamp(payload["issuedAt"]).tz_convert("UTC")
    local_issue = issued_at.tz_convert(ZONE).tz_localize(None)
    targets = pd.DataFrame(payload["slots"], columns=["lot_id", "target_time"])
    targets["target_time"] = pd.to_datetime(targets.target_time, format="mixed", utc=True)
    targets["slot_dt"] = targets.target_time.dt.tz_convert(ZONE).dt.tz_localize(None)
    targets["date"] = targets.slot_dt.dt.normalize()
    targets["slot"] = targets.slot_dt.dt.hour * 2 + targets.slot_dt.dt.minute // 30

    calendar = pd.DataFrame(payload["days"], columns=["calendar_date", *DAY_COLUMNS])
    calendar["date"] = pd.to_datetime(calendar.pop("calendar_date"))
    targets = targets.join(calendar.set_index("date"), on="date")
    terms = pd.DataFrame(payload["terms"])
    for column in ("term_start", "term_end", "instruction_start"):
        terms[column] = pd.to_datetime(terms[column]).dt.date
    for column in ("is_instruction_day", "is_holiday"):
        targets[column] = targets[column].eq(True)

    readings = pd.DataFrame(payload["readings"], columns=SCRAPE_COLUMNS)
    readings["scraped_at"] = pd.to_datetime(readings.scraped_at, format="mixed", utc=True)
    readings["occupancy_pct"] = pd.to_numeric(readings.occupancy_pct, errors="coerce")
    scrapes, _ = clean_occupancy(readings.loc[readings.scraped_at.lt(issued_at)])
    scrapes["local_timestamp"] = scrapes.scraped_at.dt.tz_convert(ZONE).dt.tz_localize(None)
    scrapes["slot_dt"] = scrapes.target_time.dt.tz_convert(ZONE).dt.tz_localize(None)
    scrapes["date"] = scrapes.slot_dt.dt.normalize()
    for column in ("is_instruction_day", "is_holiday"):
        scrapes[column] = scrapes[column].eq(True)
    observed = observations_for_history(scrapes)

    # The lab computes history for observed slots. Add empty slots so it can
    # compute the same inputs for times that have yet to happen.
    panel = pd.concat([observed, targets[["lot_id", "date", "slot_dt", "slot", *DAY_COLUMNS]]],
                      ignore_index=True).drop_duplicates(SLOT_KEYS)
    panel = panel.sort_values(["date", "slot", "lot_id"])
    history = history_features(panel)
    history = history.loc[history.slot.between(14, 43)]
    inputs = snapshot_inputs(targets, features, terms, history)
    # Without a daily calendar row we can still use last week's reading.
    inputs.loc[targets.phase.isna(), HISTORY_FEATURES[0]] = float("nan")
    with threadpool_limits(limits=2):
        targets["tree_forecast"] = model.predict(inputs).clip(0, 100)

    targets["forecast"] = targets.tree_forecast
    daytime = targets.slot.between(14, 43)
    starts = pd.to_datetime(terms.loc[terms.term_type.isin(["spring", "fall"]), "instruction_start"])
    completed = observed.loc[observed.slot.between(14, 43) & observed.date.lt(local_issue.normalize())]
    opening = blend_opening_curve(targets.loc[daytime], completed, starts)
    targets.loc[daytime, "forecast"] = adjust_after_clearing(opening, scrapes, issued_at=local_issue).forecast
    return targets.forecast.tolist()


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 4_500_000


@app.post("/predict")
def predict_request():
    payload = request.get_json()
    try:
        return jsonify(predictions=predict(payload))
    except Exception:
        logging.exception("Flint prediction failed")
        return jsonify(error="Flint prediction failed"), 500
