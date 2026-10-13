from dataclasses import dataclass

import pandas as pd

from .features import build_features


DEFAULT_FEATURES = (
    "lot_id", "weekday", "minute_of_day", "is_us_holiday",
    "calendar", "days_into_calendar", "days_until_term_end", "days_since_instruction_start",
)


@dataclass
class TrainingData:
    X: pd.DataFrame
    y: pd.Series
    targets: pd.DataFrame
    summary: dict


def prepare_training_data(
    observations: pd.DataFrame,
    features: tuple[str, ...] = DEFAULT_FEATURES,
) -> TrainingData:
    """Prepare half-hour training examples without fitting a model."""
    rows = observations.copy()
    rows["target_time"] = rows["scraped_at"].dt.tz_convert("UTC").dt.round("30min")
    local_time = rows["target_time"].dt.tz_convert("America/Los_Angeles")

    missing = rows["occupancy_pct"].isna()
    invalid = ~missing & ~rows["occupancy_pct"].between(0, 100)
    frozen = local_time.between(
        pd.Timestamp("2026-04-09 11:00", tz="America/Los_Angeles"),
        pd.Timestamp("2026-04-22 12:00", tz="America/Los_Angeles"),
    )
    rows = rows.loc[~(missing | invalid | frozen)]

    # Keep the latest reading when multiple scrapes map to the same slot.
    rows = rows.sort_values(["scraped_at", "id"])
    duplicates = rows.duplicated(["lot_id", "target_time"], keep="last")
    rows = rows.loc[~duplicates].sort_values(["target_time", "lot_id"]).reset_index(drop=True)

    targets = rows[["lot_id", "target_time"]].copy()
    X = build_features(targets, features=features)
    y = rows["occupancy_pct"].rename("occupancy_pct")
    summary = {
        "input_rows": len(observations),
        "missing_occupancy_rows": int(missing.sum()),
        "out_of_range_rows": int(invalid.sum()),
        "known_frozen_rows": int(frozen.sum()),
        "excluded_rows": int((missing | invalid | frozen).sum()),
        "duplicate_slot_rows": int(duplicates.sum()),
        "training_rows": len(rows),
        "missing_features": X.isna().sum().to_dict(),
    }
    return TrainingData(X=X, y=y, targets=targets, summary=summary)
