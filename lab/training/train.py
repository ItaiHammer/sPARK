import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import joblib
import pandas as pd

from .algorithms.hgb import fit_model
from .data import load_occupancy
from .dataset import prepare_training_data
from .evaluate import score_predictions
from .report import write_run_readme


def run_experiment(
    start: datetime, split: datetime, end: datetime, *, experiment: str = "flint_v0.1"
) -> Path:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", experiment):
        raise ValueError("Experiment names must start with a letter or number and can contain dots, hyphens, and underscores.")
    if not start < split < end:
        raise ValueError("Dates must satisfy start < split < end.")

    data = prepare_training_data(load_occupancy(start, end))
    times = data.targets["target_time"]
    train = (times >= start) & (times < split)
    test = (times >= split) & (times < end)
    X_train, y_train = data.X.loc[train], data.y.loc[train]
    X_test, y_test = data.X.loc[test], data.y.loc[test]

    model = fit_model(X_train, y_train)
    predicted = model.predict(X_test)

    keys = ["lot_id", "weekday", "minute_of_day"]
    averages = X_train.assign(occupancy=y_train).groupby(keys)["occupancy"].mean()
    baseline = averages.reindex(pd.MultiIndex.from_frame(X_test[keys])).fillna(y_train.mean()).to_numpy()

    predictions = data.targets.loc[test].copy()
    predictions["actual"] = y_test
    predictions["predicted"] = predicted
    predictions["baseline"] = baseline
    predictions["absolute_error"] = abs(y_test - predicted)
    daytime = X_test["minute_of_day"].between(420, 1290)
    metrics = {
        "model_all_hours": score_predictions(y_test, predicted),
        "baseline_all_hours": score_predictions(y_test, baseline),
        "model_daytime": score_predictions(y_test.loc[daytime], predicted[daytime.to_numpy()]),
        "baseline_daytime": score_predictions(y_test.loc[daytime], baseline[daytime.to_numpy()]),
    }
    metadata = {
        "experiment": experiment,
        "purpose": "Single chronological validation experiment; not multi-fold qualification",
        "evaluation_role": "validation",
        "start_inclusive": start.isoformat(), "split": split.isoformat(), "end_exclusive": end.isoformat(),
        "train_rows": len(X_train), "test_rows": len(X_test), "daytime_test_rows": int(daytime.sum()),
        "features": list(data.X.columns), "model_parameters": model.get_params(),
        "preparation": data.summary,
        "daytime_hours_pacific": "07:00 through 21:30",
        "scope": "Available valid observed half-hour slots; missing outcomes are not scored",
        "calendar_assumption": "Current academic_terms; historical as-issued versions are not reconstructed",
    }

    run_id = datetime.now(timezone.utc).strftime("run-%Y%m%dT%H%M%S%fZ")
    output = Path(__file__).resolve().parents[1] / "local_experiments" / experiment / "runs" / run_id
    output.mkdir(parents=True, exist_ok=False)
    joblib.dump(model, output / "model.joblib")
    predictions.to_csv(output / "predictions.csv", index=False)
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (output / "run.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    write_run_readme(output, metadata, metrics)
    print(json.dumps({"output": str(output), "train_rows": len(X_train), "test_rows": len(X_test), **metrics}, indent=2))
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--experiment", default="flint_v0.1", help="Experiment folder name; each execution saves a new run.")
    parser.add_argument("--start", default="2026-09-01")
    parser.add_argument("--split", default="2026-09-21")
    parser.add_argument("--end", default="2026-09-28")
    args = parser.parse_args()
    pacific = ZoneInfo("America/Los_Angeles")
    dates = [datetime.fromisoformat(value).replace(tzinfo=pacific) for value in (args.start, args.split, args.end)]
    run_experiment(*dates, experiment=args.experiment)
