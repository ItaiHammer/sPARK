from datetime import date
from unittest.mock import Mock

import httpx
import pandas as pd
import pytest
from postgrest import SyncPostgrestClient

from training import features as feature_module
from training.features import build_features, is_us_holiday


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


def test_terms_query_paginates_and_derives_calendar_features(monkeypatch):
    requests = []
    records = [
        {"term_id": "fall", "term_type": "fall", "term_start": "2026-08-17", "term_end": "2026-12-18", "instruction_start": "2026-08-19"},
        {"term_id": "winter", "term_type": "winter", "term_start": "2027-01-04", "term_end": "2027-01-22", "instruction_start": "2027-01-04"},
        {"term_id": "spring", "term_type": "spring", "term_start": "2027-01-25", "term_end": "2027-05-28", "instruction_start": "2027-01-27"},
    ]

    def handler(request):
        requests.append(request)
        assert request.url.path.endswith("/academic_terms")
        assert request.url.params["location_id"] == "eq.sjsu"
        assert request.url.params["select"] == "term_id,term_type,term_start,term_end,instruction_start"
        assert request.url.params["order"] == "term_start.asc,term_id.asc"
        offset = int(request.url.params["offset"])
        return httpx.Response(200, json=records[offset:offset + 1])

    with httpx.Client(transport=httpx.MockTransport(handler)) as session:
        client = SyncPostgrestClient("https://example.invalid/rest/v1", http_client=session)
        monkeypatch.setattr(feature_module, "create_lab_client", lambda: Mock(table=client.from_))
        targets = pd.DataFrame({
            "lot_id": ["north", "south", "north", "north"],
            "target_time": pd.to_datetime([
                "2026-08-17T17:00:00Z", "2026-08-17T17:30:00Z",
                "2026-12-20T17:00:00Z", "2027-06-01T17:00:00Z",
            ], utc=True),
        }, index=[8, 2, 7, 9])

        result = build_features(targets, features=("calendar", "days_into_calendar", "days_until_term_end"))

    assert result.index.tolist() == [8, 2, 7, 9]
    assert result["calendar"].iloc[:3].tolist() == ["fall", "fall", "break"]
    assert pd.isna(result["calendar"].iloc[3])
    assert result["days_into_calendar"].iloc[:2].tolist() == [0, 0]
    assert result["days_into_calendar"].iloc[2:].isna().all()
    assert result["days_until_term_end"].iloc[:2].tolist() == [123, 123]
    assert result["days_until_term_end"].iloc[2:].isna().all()
    assert len(requests) == 4


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


def test_term_boundaries_use_pacific_dates(monkeypatch):
    terms = pd.DataFrame([{
        "term_id": "fall", "term_type": "fall",
        "term_start": date(2026, 8, 17), "term_end": date(2026, 12, 18),
        "instruction_start": date(2026, 8, 19),
    }])
    monkeypatch.setattr(feature_module, "load_terms", lambda: terms)
    targets = pd.DataFrame({
        "lot_id": ["north"] * 4,
        "target_time": pd.to_datetime([
            "2026-08-17T06:30:00Z", "2026-08-17T07:30:00Z",
            "2026-12-19T07:30:00Z", "2026-12-19T08:30:00Z",
        ], utc=True),
    }, index=[9, 2, 5, 4])

    result = build_features(targets, features=("calendar", "days_into_calendar", "days_until_term_end"))

    assert result.index.equals(targets.index)
    assert result["calendar"].iloc[1:3].tolist() == ["fall", "fall"]
    assert result.iloc[[0, 3]].isna().all().all()
    assert result["days_into_calendar"].iloc[1:3].tolist() == [0, 123]
    assert result["days_until_term_end"].iloc[1:3].tolist() == [123, 0]


def test_removed_instruction_features_are_rejected():
    targets = pd.DataFrame({
        "lot_id": ["north"],
        "target_time": pd.to_datetime(["2026-10-12T17:00:00Z"], utc=True),
    })
    for name in ["is_instruction_day", "is_within_instruction_period"]:
        with pytest.raises(ValueError, match="Unknown feature"):
            build_features(targets, features=(name,))


def test_no_terms_keeps_calendar_unknown(monkeypatch):
    terms = pd.DataFrame(columns=["term_id", "term_type", "term_start", "term_end"])
    monkeypatch.setattr(feature_module, "load_terms", lambda: terms)
    targets = pd.DataFrame({
        "lot_id": ["north"],
        "target_time": pd.to_datetime(["2026-10-12T17:00:00Z"], utc=True),
    })
    result = build_features(targets, features=("calendar", "days_until_term_end"))
    assert result.isna().all().all()


def test_instruction_start_counts_calendar_days_and_pacific_dates(monkeypatch):
    terms = pd.DataFrame([{
        "term_id": "fall", "term_type": "fall", "term_start": date(2026, 8, 17),
        "term_end": date(2026, 12, 18), "instruction_start": date(2026, 8, 19),
    }])
    monkeypatch.setattr(feature_module, "load_terms", lambda: terms)
    targets = pd.DataFrame({
        "lot_id": ["north"] * 6,
        "target_time": pd.to_datetime([
            "2026-08-17T17:00:00Z", "2026-08-19T06:30:00Z", "2026-08-19T07:30:00Z",
            "2026-08-20T17:00:00Z", "2026-08-22T17:00:00Z", "2026-12-19T20:00:00Z",
        ], utc=True),
    }, index=[9, 2, 6, 4, 3, 8])
    result = build_features(targets, features=("days_since_instruction_start",))
    assert result.index.equals(targets.index)
    assert result.iloc[:5, 0].tolist() == [-2, -1, 0, 1, 3]
    assert pd.isna(result.iloc[5, 0])


def test_missing_summer_term_is_unknown_between_future_spring_and_fall(monkeypatch):
    terms = pd.DataFrame([
        {"term_id": "spring", "term_type": "spring", "term_start": date(2027, 1, 25),
         "term_end": date(2027, 5, 28), "instruction_start": date(2027, 1, 27)},
        {"term_id": "fall", "term_type": "fall", "term_start": date(2027, 8, 17),
         "term_end": date(2027, 12, 17), "instruction_start": date(2027, 8, 19)},
    ])
    monkeypatch.setattr(feature_module, "load_terms", lambda: terms)
    targets = pd.DataFrame({"lot_id": ["north", "north"],
        "target_time": pd.to_datetime(["2027-07-01T17:00:00Z", "2027-08-17T17:00:00Z"], utc=True)})
    result = build_features(targets, features=("calendar", "days_since_instruction_start"))
    assert result.iloc[0].isna().all()
    assert result.iloc[1].tolist() == ["fall", -2]
