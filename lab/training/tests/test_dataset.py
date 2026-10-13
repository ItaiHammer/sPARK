import pandas as pd

from training import features as feature_module
from training.dataset import prepare_training_data


def test_cleaning_preserves_zero_and_keeps_latest_valid_slot_reading():
    observations = pd.DataFrame({
        "id": [1, 2, 3, 4, 5, 6],
        "lot_id": ["north"] * 6,
        "scraped_at": pd.to_datetime([
            "2026-09-21T17:00:00Z", "2026-09-21T17:29:00Z", "2026-09-21T17:30:00Z",
            "2026-09-21T18:00:00Z", "2026-09-21T18:30:00Z", "2026-09-21T19:00:00Z",
        ], utc=True),
        "occupancy_pct": [0, 40, 45, None, -1, 101],
    })
    original = observations.copy(deep=True)

    data = prepare_training_data(observations, features=("lot_id", "minute_of_day"))

    assert data.y.tolist() == [0, 45]
    assert data.X["minute_of_day"].tolist() == [600, 630]
    assert data.X.index.equals(data.y.index)
    assert data.X.index.equals(data.targets.index)
    assert data.summary["input_rows"] == 6
    assert data.summary["excluded_rows"] == 3
    assert data.summary["duplicate_slot_rows"] == 1
    assert data.summary["training_rows"] == 2
    pd.testing.assert_frame_equal(observations, original)


def test_known_freeze_is_excluded_at_both_boundaries():
    observations = pd.DataFrame({
        "id": [1, 2, 3, 4], "lot_id": ["north"] * 4,
        "scraped_at": pd.to_datetime([
            "2026-04-09T17:30:00Z", "2026-04-09T18:00:00Z",
            "2026-04-22T19:00:00Z", "2026-04-22T19:30:00Z",
        ], utc=True),
        "occupancy_pct": [10, 20, 30, 40],
    })
    data = prepare_training_data(observations, features=("lot_id",))
    assert data.y.tolist() == [10, 40]
    assert data.summary["known_frozen_rows"] == 2


def test_repeated_dst_hour_remains_two_distinct_targets():
    observations = pd.DataFrame({
        "id": [1, 2], "lot_id": ["north", "north"],
        "scraped_at": pd.to_datetime(["2026-11-01T08:30:00Z", "2026-11-01T09:30:00Z"], utc=True),
        "occupancy_pct": [10, 20],
    })
    data = prepare_training_data(observations, features=("minute_of_day",))
    assert data.X["minute_of_day"].tolist() == [90, 90]
    assert data.targets["target_time"].nunique() == 2
    assert data.summary["duplicate_slot_rows"] == 0


def test_missing_calendar_is_reported_without_dropping_labels(monkeypatch):
    monkeypatch.setattr(feature_module, "load_terms", lambda: pd.DataFrame(
        columns=["term_id", "term_type", "term_start", "term_end"]
    ))
    observations = pd.DataFrame({
        "id": [1], "lot_id": ["north"],
        "scraped_at": pd.to_datetime(["2026-09-21T17:00:00Z"], utc=True),
        "occupancy_pct": [70],
    })
    data = prepare_training_data(observations)
    assert data.y.tolist() == [70]
    assert data.summary["missing_features"]["calendar"] == 1
