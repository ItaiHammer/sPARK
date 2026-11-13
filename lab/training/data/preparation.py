from dataclasses import dataclass
from datetime import time

import pandas as pd

from ..features import build_features
from ..features.history import HISTORY_FEATURES, SLOT_KEYS, history_features
from ..features.time import ZONE, minute_of_day


DEFAULT_FEATURES = (
    "lot_id", "weekday", "minute_of_day", "is_us_holiday",
    "calendar", "days_into_calendar", "days_until_term_end",
)


@dataclass
class TrainingData:
    X: pd.DataFrame
    y: pd.Series
    targets: pd.DataFrame
    summary: dict


def clean_occupancy(observations: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Round scrapes and exclude invalid readings and the known feed freeze."""
    rows = observations.copy()
    rows["target_time"] = rows["scraped_at"].dt.tz_convert("UTC").dt.round("30min")
    local_time = rows["target_time"].dt.tz_convert(ZONE)

    missing = rows["occupancy_pct"].isna()
    invalid = ~missing & ~rows["occupancy_pct"].between(0, 100)
    frozen = local_time.between(
        pd.Timestamp("2026-04-09 11:00", tz=ZONE),
        pd.Timestamp("2026-04-22 12:00", tz=ZONE),
    )
    excluded = missing | invalid | frozen
    return rows.loc[~excluded].copy(), {
        "input_rows": len(observations),
        "missing_occupancy_rows": int(missing.sum()),
        "out_of_range_rows": int(invalid.sum()),
        "known_frozen_rows": int(frozen.sum()),
        "excluded_rows": int(excluded.sum()),
    }


def prepare_training_data(
    observations: pd.DataFrame,
    features: tuple[str, ...] = DEFAULT_FEATURES,
) -> TrainingData:
    """Prepare half-hour training examples without fitting a model."""
    rows, summary = clean_occupancy(observations)
    # Keep the latest reading when multiple scrapes map to the same slot.
    rows = rows.sort_values(["scraped_at", "id"])
    duplicates = rows.duplicated(["lot_id", "target_time"], keep="last")
    rows = rows.loc[~duplicates].sort_values(["target_time", "lot_id"]).reset_index(drop=True)

    targets = rows[["lot_id", "target_time"]].copy()
    X = build_features(targets, features=features)
    y = rows["occupancy_pct"].rename("occupancy_pct")
    summary.update({
        "duplicate_slot_rows": int(duplicates.sum()),
        "training_rows": len(rows),
        "missing_features": X.isna().sum().to_dict(),
    })
    return TrainingData(X=X, y=y, targets=targets, summary=summary)


def observations_for_training(scrapes: pd.DataFrame, start: pd.Timestamp) -> pd.DataFrame:
    """Keep the highest snapshot observation ID per UTC slot, including overnight."""
    available = scrapes.scraped_at.ge(start.tz_localize(ZONE))
    # A repeated Pacific hour contains two distinct UTC slots.
    return (scrapes.loc[available].sort_values("occupancy_id")
            .drop_duplicates(["lot_id", "target_time"], keep="last").reset_index(drop=True))


def observations_for_history(scrapes: pd.DataFrame) -> pd.DataFrame:
    """Average valid duplicates for the canonical history and scoring panel."""
    slots = scrapes.local_timestamp.dt.round("30min")
    dates = slots.dt.normalize()
    same_day = dates.eq(scrapes.local_timestamp.dt.normalize())
    rounded = scrapes.loc[same_day].assign(slot_dt=slots, date=dates)
    panel = rounded.groupby(SLOT_KEYS + ["date"], as_index=False).agg(
        occupancy_pct=("occupancy_pct", "mean"),
        term_type=("term_type", "first"), phase=("phase", "first"),
        is_instruction_day=("is_instruction_day", "first"), is_holiday=("is_holiday", "first"),
    )
    for name in ("term_type", "phase"):
        panel[name] = panel[name].fillna("break")
    panel["slot"] = panel.slot_dt.dt.hour * 2 + panel.slot_dt.dt.minute // 30
    return panel.sort_values(["date", "slot", "lot_id"]).reset_index(drop=True)


def snapshot_inputs(rows: pd.DataFrame, features, terms, history) -> pd.DataFrame:
    targets = rows if "target_time" in rows else rows.assign(target_time=rows.slot_dt.dt.tz_localize(ZONE))
    inputs = build_features(targets, features, terms=terms, history=history)
    types = {"lot_id": "category", "calendar": "category",
             "days_into_calendar": "float64", "days_until_term_end": "float64"}
    return inputs.astype({name: dtype for name, dtype in types.items() if name in inputs})


def prepare_snapshot(observations, terms, features, start, daytime):
    scrapes, summary = clean_occupancy(observations)
    if scrapes.empty:
        raise ValueError("The snapshot has no eligible occupancy readings.")
    scrapes["local_timestamp"] = scrapes.scraped_at.dt.tz_convert(ZONE).dt.tz_localize(None)
    scrapes["slot_dt"] = scrapes.target_time.dt.tz_convert(ZONE).dt.tz_localize(None)
    scrapes["date"] = scrapes.slot_dt.dt.normalize()
    labels = observations_for_training(scrapes, start)
    history = observations_for_history(scrapes)
    if any(name in features for name in HISTORY_FEATURES):
        history = history_features(history)
    first, last = (time.fromisoformat(hour) for hour in daytime)
    history = history.loc[history.slot.mul(30).between(
        minute_of_day(first.hour, first.minute), minute_of_day(last.hour, last.minute))]
    inputs = snapshot_inputs(labels, features, terms, history)
    training = TrainingData(X=inputs, y=labels.occupancy_pct, targets=labels, summary=summary)
    return scrapes, history, training


def fit_slice(training: TrainingData, fit: pd.Timestamp):
    earlier = training.targets.date.lt(fit) & training.targets.scraped_at.lt(fit.tz_localize(ZONE))
    if not earlier.any():
        raise ValueError(f"No eligible training observations before {fit.date()}.")
    inputs = training.X.loc[earlier]
    missing = [name for name in HISTORY_FEATURES if name in inputs and inputs[name].isna().all()]
    if missing:
        raise ValueError(f"No observed values for {', '.join(missing)} before {fit.date()}. Choose a later cutoff.")
    return inputs, training.y.loc[earlier]
