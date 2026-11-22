from unittest.mock import Mock

import pandas as pd
import pytest

from training.features import academic as feature_module
from training.features import build_features


def test_features_use_pacific_dates_and_daylight_saving_time():
    observations = pd.DataFrame(
        {
            "lot_id": ["north", "south", "north"],
            "target_time": pd.to_datetime(
                ["2026-01-06T07:30:00Z", "2026-07-07T07:30:00Z", "2026-07-07T06:30:00Z"],
                utc=True,
            ),
        },
        index=[10, 20, 30],
    )
    original = observations.copy(deep=True)

    features = build_features(observations)

    assert features.to_dict("list") == {
        "lot_id": ["north", "south", "north"],
        "weekday": [0, 1, 0],
        "minute_of_day": [1410, 30, 1410],
        "is_us_holiday": [0, 0, 0],
    }
    assert features.index.equals(observations.index)
    pd.testing.assert_frame_equal(observations, original)


def test_occupancy_labels_do_not_affect_features():
    future_rows = pd.DataFrame(
        {
            "lot_id": ["north"],
            "target_time": pd.to_datetime(["2026-10-12T17:00:00Z"], utc=True),
        }
    )

    expected = build_features(future_rows)

    for occupancy in [0, 100]:
        historical_rows = future_rows.assign(occupancy_pct=occupancy)
        pd.testing.assert_frame_equal(build_features(historical_rows), expected)


def test_empty_input_keeps_feature_columns():
    observations = pd.DataFrame(
        {
            "lot_id": pd.Series(dtype="str"),
            "target_time": pd.Series(dtype="datetime64[ns, UTC]"),
        }
    )

    features = build_features(observations)

    assert features.empty
    assert list(features.columns) == ["lot_id", "weekday", "minute_of_day", "is_us_holiday"]


def test_feature_selection_skips_unused_external_lookups(monkeypatch):
    def unexpected_lookup(*args, **kwargs):
        pytest.fail("An unselected feature fetched external data")

    monkeypatch.setattr(feature_module, "calendar_features", unexpected_lookup)
    targets = pd.DataFrame({
        "lot_id": ["north"],
        "target_time": pd.to_datetime(["2026-10-12T17:00:00Z"], utc=True),
    })

    result = build_features(targets, features=("minute_of_day", "lot_id"))

    assert list(result.columns) == ["minute_of_day", "lot_id"]
    assert result.iloc[0].tolist() == [600, "north"]


def test_empty_targets_do_not_fetch_calendar(monkeypatch):
    calendar = Mock(side_effect=AssertionError("Unexpected database query"))
    monkeypatch.setattr(feature_module, "calendar_features", calendar)
    targets = pd.DataFrame({
        "lot_id": pd.Series(dtype="str"),
        "target_time": pd.Series(dtype="datetime64[ns, UTC]"),
    })
    names = ("calendar", "days_into_calendar", "lot_id", "days_until_term_end")
    result = build_features(targets, features=names)
    assert result.empty
    assert list(result.columns) == list(names)


def test_removed_instruction_features_are_rejected():
    targets = pd.DataFrame({
        "lot_id": ["north"],
        "target_time": pd.to_datetime(["2026-10-12T17:00:00Z"], utc=True),
    })
    for name in ["is_instruction_day", "is_within_instruction_period"]:
        with pytest.raises(ValueError, match="Unknown feature"):
            build_features(targets, features=(name,))
