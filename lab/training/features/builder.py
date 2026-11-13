import pandas as pd

from . import academic
from .history import HISTORY_FEATURES, SLOT_KEYS
from .holidays import is_us_holiday
from .time import ZONE, minute_of_day, weekday


ACADEMIC_FEATURES = {"calendar", "days_into_calendar", "days_until_term_end", "days_since_instruction_start"}


def build_features(
    targets: pd.DataFrame,
    features: tuple[str, ...] = ("lot_id", "weekday", "minute_of_day", "is_us_holiday"),
    *,
    terms: pd.DataFrame | None = None,
    history: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Build selected features from lot_id and timezone-aware target_time columns."""
    local_time = targets["target_time"].dt.tz_convert(ZONE)
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
        elif feature not in ACADEMIC_FEATURES and feature not in HISTORY_FEATURES:
            raise ValueError(f"Unknown feature: {feature}")

    calendar_columns = [name for name in features if name in ACADEMIC_FEATURES]
    if calendar_columns and not targets.empty:
        calendar = (academic.calendar_features(local_time) if terms is None
                    else academic.calendar_features(local_time, terms=terms))
        result[calendar_columns] = calendar[calendar_columns]

    history_columns = [name for name in features if name in HISTORY_FEATURES]
    if history_columns and not targets.empty:
        if history is None:
            raise ValueError("History features need a prepared occupancy history.")
        slots = pd.MultiIndex.from_arrays(
            [targets.lot_id, local_time.dt.tz_localize(None)], names=SLOT_KEYS)
        result[history_columns] = history.set_index(SLOT_KEYS)[history_columns].reindex(slots).to_numpy()

    return result.reindex(columns=features)
