from datetime import date

import pandas as pd

from training.features import build_features
from training.features.holidays import is_us_holiday


def test_holiday_uses_observed_date_including_year_boundary():
    assert is_us_holiday(date(2026, 7, 3)) == 1
    assert is_us_holiday(date(2026, 7, 4)) == 0
    assert is_us_holiday(date(2021, 12, 31)) == 1
    assert is_us_holiday(date(2026, 7, 6)) == 0


def test_holiday_uses_local_date():
    observations = pd.DataFrame({
        "lot_id": ["north", "north"],
        "target_time": pd.to_datetime(["2026-07-04T06:30:00Z", "2026-07-04T07:30:00Z"], utc=True),
    })
    assert build_features(observations)["is_us_holiday"].tolist() == [1, 0]
