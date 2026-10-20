from datetime import date
from unittest.mock import Mock

import httpx
import pandas as pd
from postgrest import SyncPostgrestClient

from training.features import academic as feature_module
from training.features import build_features


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
