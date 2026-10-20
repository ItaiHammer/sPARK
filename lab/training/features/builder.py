import pandas as pd

from . import academic
from .holidays import is_us_holiday
from .time import minute_of_day, weekday


def build_features(
    targets: pd.DataFrame,
    features: tuple[str, ...] = ("lot_id", "weekday", "minute_of_day", "is_us_holiday"),
) -> pd.DataFrame:
    """Build selected features from lot_id and timezone-aware target_time columns."""
    local_time = targets["target_time"].dt.tz_convert("America/Los_Angeles")
    result = pd.DataFrame(index=targets.index)

    for feature in features:
        if feature == "lot_id":
            result[feature] = targets["lot_id"]
        elif feature == "weekday":
            result[feature] = local_time.map(weekday)
        elif feature == "minute_of_day":
            result[feature] = local_time.map(lambda time: minute_of_day(time.hour, time.minute))
        elif feature == "is_us_holiday":
            result[feature] = local_time.dt.date.map(is_us_holiday)
        elif feature not in {"calendar", "days_into_calendar", "days_until_term_end", "days_since_instruction_start"}:
            raise ValueError(f"Unknown feature: {feature}")

    calendar_columns = [
        name for name in features
        if name in {"calendar", "days_into_calendar", "days_until_term_end", "days_since_instruction_start"}
    ]
    if calendar_columns and not targets.empty:
        result[calendar_columns] = academic.calendar_features(local_time)[calendar_columns]

    return result.reindex(columns=features)
