import json
from pathlib import Path


def write_run_readme(output: Path, metadata: dict, metrics: dict) -> None:
    experiment = metadata.get("experiment", output.parent.parent.name)
    parameters = json.dumps(metadata["model_parameters"], indent=2)
    scores = "\n".join(
        f"| {name} | {values['mae_pp']:.3f} | {values['rmse_pp']:.3f} |"
        for name, values in metrics.items()
    )
    text = f"""# {experiment}: {output.name}

## Data split

Times are Pacific; starts are inclusive and ends exclusive.

| Set | Start | End | Prepared examples |
| --- | --- | --- | --- |
| Training | {metadata['start_inclusive']} | {metadata['split']} | {metadata['train_rows']} |
| Validation | {metadata['split']} | {metadata['end_exclusive']} | {metadata['test_rows']} |

The evaluation has been used for model comparison/tuning. Legacy JSON keys test_rows and daytime_test_rows count validation examples in this workflow.

Designated historical test benchmark: 2026-09-28 through 2026-10-04, end exclusive 2026-10-05. This week was previously used for tuning, so it is not an untouched final test. This README does not claim a separate test evaluation was performed. See the [shared split plan](../../../README.md).

## Features and settings

Features: {', '.join(metadata['features'])}.

```json
{parameters}
```

## Validation results

| Measurement | MAE (points) | RMSE (points) |
| --- | --- | --- |
{scores}

Daytime: {metadata['daytime_hours_pacific']}. Primary comparison score: model_daytime MAE. These are single-period results, not year-round qualification.

## Saved files

[Model](model.joblib), [parameters and preparation](run.json), [metrics](metrics.json), [individual predictions](predictions.csv).

Calendar inputs use current academic_terms; historical as-issued calendar versions are not reconstructed. Exact source snapshots/hashes are not recorded yet.

## Notes

Record what you changed, why, and what you learned here.
"""
    (output / "README.md").write_text(text, encoding="utf-8")
