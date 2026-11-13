import argparse
import hashlib
import json
import platform
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import joblib
import numpy as np
import pandas as pd
import sklearn
from threadpoolctl import threadpool_limits

from .algorithms.hgb import fit_model
from .data.loader import load_occupancy, load_snapshot, load_term_snapshot
from .data.preparation import fit_slice, prepare_snapshot, prepare_training_data
from .evaluation.metrics import score_predictions
from .evaluation.replay import replay, score_replay, verify_reference
from .evaluation.report import write_run_readme
from .features.history import HISTORY_FEATURES
from .features.time import ZONE
from .recipes import EXPERIMENTS, load_recipe, validate_experiment_name


REFERENCE_TERMS = EXPERIMENTS / "flint_v0.2/supporting_experiments/recipe_selection/academic_terms.csv"


def new_run(experiment: str) -> Path:
    run_id = datetime.now(timezone.utc).strftime("run-%Y%m%dT%H%M%S%fZ")
    output = Path(__file__).resolve().parents[1] / "local_experiments" / experiment / "runs" / run_id
    output.mkdir(parents=True, exist_ok=False)
    return output


def save_model(model, output: Path) -> Path:
    path = output / "model.joblib"
    joblib.dump(model, path)
    return path


def run_experiment(
    start: datetime, split: datetime, end: datetime, *,
    experiment: str = "flint_v0.1", recipe_name: str = "flint_v0.1",
) -> Path:
    validate_experiment_name(experiment)
    if not start < split < end:
        raise ValueError("Dates must satisfy start < split < end.")

    spec = load_recipe(recipe_name)
    if set(spec["features"]) & set(HISTORY_FEATURES) or spec.get("forecast_adjustment"):
        raise ValueError("This recipe needs the calendar and history in a snapshot. Pass --snapshot.")
    data = prepare_training_data(load_occupancy(start, end), features=tuple(spec["features"]))
    times = data.targets["target_time"]
    train = (times >= start) & (times < split)
    test = (times >= split) & (times < end)
    X_train, y_train = data.X.loc[train], data.y.loc[train]
    X_test, y_test = data.X.loc[test], data.y.loc[test]

    model = fit_model(X_train, y_train, parameters=spec["model_parameters"])
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

    output = new_run(experiment)
    save_model(model, output)
    predictions.to_csv(output / "predictions.csv", index=False)
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (output / "run.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    write_run_readme(output, metadata, metrics)
    print(json.dumps({"output": str(output), "train_rows": len(X_train), "test_rows": len(X_test), **metrics}, indent=2))
    return output


def file_hash(path: Path) -> str:
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def parse_date(value):
    return pd.Timestamp(datetime.strptime(value, "%Y-%m-%d").date())


def run_snapshot(args, recipe_name: str, experiment: str) -> Path:
    validate_experiment_name(experiment)
    spec = load_recipe(recipe_name)
    # Use the same replay dates and daytime slots for each recipe.
    protocol = load_recipe("flint_v0.3")["replay"]
    terms = load_term_snapshot(args.terms)
    start = pd.Timestamp(spec.get("training_start") or spec["start_inclusive"][:10])
    scrapes, history, training = prepare_snapshot(
        load_snapshot(args.snapshot), terms, spec["features"], start, protocol["daytime_pacific"])
    manifest = {
        "experiment": experiment,
        "recipe": recipe_name,
        "command": args.command,
        "features": spec["features"],
        "model_parameters": spec["model_parameters"],
        "training_start": str(start.date()),
        "python": platform.python_version(),
        "sklearn": sklearn.__version__,
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "snapshot_sha256": file_hash(args.snapshot),
        "terms_sha256": file_hash(args.terms),
    }
    if args.command == "train":
        fit = args.fit or pd.Timestamp(spec.get("reference_fit") or spec["split"][:10])
        x, y = fit_slice(training, fit)
        with threadpool_limits(limits=4):
            model = fit_model(x, y, parameters=spec["model_parameters"])
            output = new_run(experiment)
            model_path = save_model(model, output)
            reloaded = joblib.load(model_path)
            sample = x.iloc[:64]
            np.testing.assert_array_equal(model.predict(sample), reloaded.predict(sample))
        manifest.update(fit_date=str(fit.date()), training_rows=len(y), model_sha256=file_hash(model_path),
                        model_bytes=model_path.stat().st_size, verified_reload_rows=len(sample))
    else:
        first = args.first or pd.Timestamp(protocol["first_issue"])
        last = args.last or pd.Timestamp(protocol["last_issue"])
        if first > last:
            raise ValueError("--first must precede or equal --last.")
        targets, fit_rows = replay(spec, protocol, scrapes, terms, training, history, first, last, args.workers)
        scores = score_replay(targets, terms)
        reference = (
            manifest["snapshot_sha256"] == spec.get("reference_snapshot_sha256")
            and manifest["terms_sha256"] == spec.get("reference_terms_sha256")
            and first == pd.Timestamp(protocol["first_issue"])
            and last == pd.Timestamp(protocol["last_issue"])
        )
        if reference:
            verify_reference(targets, scores, EXPERIMENTS / recipe_name / "evaluation.json")
        output = new_run(experiment)
        predictions_path = output / "predictions.csv.gz"
        targets.to_csv(predictions_path, index=False)
        scores.to_csv(output / "scorecard.csv", index=False)
        manifest.update(first_issue=str(first.date()), last_issue=str(last.date()),
                        excluded_issue_range=protocol.get("excluded_issue_range"), fit_rows=fit_rows,
                        scored_rows=len(targets), predictions_sha256=file_hash(predictions_path),
                        verified_reference=reference)
    (output / "metadata.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(output)
    return output


def main():
    parser = argparse.ArgumentParser(description="Train or evaluate a lab model from a recipe.")
    parser.add_argument("command", nargs="?", choices=["train", "replay"], default="train")
    parser.add_argument("--recipe", help="Experiment containing the feature list and tree settings.")
    parser.add_argument("--experiment", help="Optional name for the output run folder.")
    parser.add_argument("--start", help="First database observation date.")
    parser.add_argument("--split", help="Database training cutoff and validation start.")
    parser.add_argument("--end", help="Exclusive database validation end.")
    parser.add_argument("--snapshot", type=Path, help="Private CSV or CSV.GZ of historical scrapes.")
    parser.add_argument("--terms", type=Path, default=REFERENCE_TERMS)
    parser.add_argument("--fit", type=parse_date, help="Snapshot training cutoff in Pacific time.")
    parser.add_argument("--first", type=parse_date, help="First observed target date in the replay.")
    parser.add_argument("--last", type=parse_date, help="Last observed target date in the replay, inclusive.")
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()
    if args.workers < 1:
        parser.error("--workers must be positive.")
    if args.command == "train" and (args.first or args.last):
        parser.error("--first and --last are replay options.")
    if args.command == "replay" and args.fit:
        parser.error("--fit is a training option.")
    try:
        if args.snapshot:
            if args.start or args.split or args.end:
                parser.error("--start, --split, and --end are for the database validation command.")
            recipe_name = args.recipe or "flint_v0.3"
            run_snapshot(args, recipe_name, args.experiment or recipe_name)
        else:
            if args.command == "replay" or args.fit:
                parser.error("This command needs --snapshot.")
            recipe_name = args.recipe or "flint_v0.1"
            dates = [
                datetime.fromisoformat(value).replace(tzinfo=ZoneInfo(ZONE))
                for value in (args.start or "2026-09-01", args.split or "2026-09-21", args.end or "2026-09-28")
            ]
            run_experiment(*dates, experiment=args.experiment or recipe_name, recipe_name=recipe_name)
    except (ValueError, FileNotFoundError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
