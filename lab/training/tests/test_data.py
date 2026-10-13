from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
from zoneinfo import ZoneInfo

import httpx
import pandas as pd
import pytest
from postgrest import SyncPostgrestClient
from postgrest.exceptions import APIError

from training import data

PACIFIC = ZoneInfo("America/Los_Angeles")
START = datetime(2026, 9, 21, tzinfo=PACIFIC)
END = datetime(2026, 9, 28, tzinfo=PACIFIC)
SETTINGS = {"SUPABASE_URL": "https://example.invalid", "SUPABASE_KEY": "test-key"}


@pytest.fixture(autouse=True)
def isolate_client(monkeypatch):
    data.create_lab_client.cache_clear()
    monkeypatch.setattr(data, "dotenv_values", lambda path: SETTINGS)
    monkeypatch.setattr(
        data,
        "create_client",
        lambda *args: pytest.fail("This test must provide a simulated client."),
    )
    yield
    data.create_lab_client.cache_clear()


@pytest.fixture
def connect_mock_database(monkeypatch):
    sessions = []

    def connect(handler):
        session = httpx.Client(transport=httpx.MockTransport(handler))
        sessions.append(session)
        database = SyncPostgrestClient(
            "https://example.invalid/rest/v1", http_client=session
        )
        client = SimpleNamespace(table=database.from_)
        monkeypatch.setattr(data, "create_client", lambda url, key: client)
        return client

    yield connect
    for session in sessions:
        session.close()


def test_client_is_created_once_using_lab_credentials(monkeypatch):
    client = object()
    read_settings = Mock(return_value=SETTINGS)
    build_client = Mock(return_value=client)
    monkeypatch.setattr(data, "dotenv_values", read_settings)
    monkeypatch.setattr(data, "create_client", build_client)

    assert data.create_lab_client() is client
    assert data.create_lab_client() is client
    read_settings.assert_called_once_with(
        Path(data.__file__).resolve().parents[1] / ".env.lab"
    )
    build_client.assert_called_once_with(SETTINGS["SUPABASE_URL"], SETTINGS["SUPABASE_KEY"])


def test_loads_all_matching_rows_even_when_the_server_returns_short_pages(
    connect_mock_database,
):
    rows = [
        {"id": 1, "lot_id": "west", "location_id": "sjsu", "scraped_at": "2026-09-21T06:59:00Z", "occupancy_pct": 50},
        {"id": 2, "lot_id": "north", "location_id": "sjsu", "scraped_at": "2026-09-21T07:30:00Z", "occupancy_pct": None},
        {"id": 3, "lot_id": "west", "location_id": "sjsu", "scraped_at": "2026-09-21T07:00:00Z", "occupancy_pct": 0},
        {"id": 4, "lot_id": "other", "location_id": "other-campus", "scraped_at": "2026-09-21T08:00:00Z", "occupancy_pct": "84.5"},
        {"id": 5, "lot_id": "west", "location_id": "sjsu", "scraped_at": "2026-09-28T07:00:00Z", "occupancy_pct": 90},
    ]
    offsets = []

    def respond(request):
        assert request.method == "GET"
        assert request.url.path == "/rest/v1/lot_occupancy"
        params = request.url.params
        assert params["order"] == "id.asc"
        assert "location_id" not in params
        filters = params.get_list("scraped_at")
        start = datetime.fromisoformat(next(value[4:] for value in filters if value.startswith("gte.")))
        end = datetime.fromisoformat(next(value[3:] for value in filters if value.startswith("lt.")))
        selected = [row for row in rows if start <= datetime.fromisoformat(row["scraped_at"]) < end]
        selected.sort(key=lambda row: row["id"])
        offset = int(params["offset"])
        limit = min(int(params["limit"]), 2)
        offsets.append(offset)
        return httpx.Response(200, json=selected[offset : offset + limit])

    connect_mock_database(respond)
    frame = data.load_occupancy(START, END)

    assert offsets == [0, 2, 3]
    assert frame["id"].tolist() == [3, 2, 4]
    assert frame["id"].is_unique
    assert frame.index.tolist() == [0, 1, 2]
    assert str(frame["scraped_at"].dt.tz) == "UTC"
    assert frame.loc[0, "scraped_at"] == pd.Timestamp("2026-09-21T07:00:00Z")
    assert frame.loc[0, "occupancy_pct"] == 0
    assert pd.isna(frame.loc[1, "occupancy_pct"])
    assert frame.loc[2, "occupancy_pct"] == 84.5


def test_empty_range_returns_an_empty_dataframe_with_expected_columns(
    connect_mock_database,
):
    respond = Mock(return_value=httpx.Response(200, json=[]))
    connect_mock_database(respond)

    frame = data.load_occupancy(START, END)

    assert frame.empty
    assert frame.columns.tolist() == [
        "id", "lot_id", "location_id", "scraped_at", "occupancy_pct"
    ]
    assert str(frame["scraped_at"].dt.tz) == "UTC"
    respond.assert_called_once()


def test_repeated_loads_reuse_the_client_but_fetch_fresh_rows(
    connect_mock_database, monkeypatch,
):
    row = {
        "id": 1,
        "lot_id": "west",
        "location_id": "sjsu",
        "scraped_at": "2026-09-21T07:00:00Z",
        "occupancy_pct": 0,
    }
    respond = Mock(side_effect=[
        httpx.Response(200, json=[row]),
        httpx.Response(200, json=[]),
        httpx.Response(200, json=[{**row, "occupancy_pct": 90}]),
        httpx.Response(200, json=[]),
    ])
    client = connect_mock_database(respond)
    build_client = Mock(return_value=client)
    monkeypatch.setattr(data, "create_client", build_client)

    first = data.load_occupancy(START, END)
    second = data.load_occupancy(START, END)

    build_client.assert_called_once()
    assert respond.call_count == 4
    assert first.loc[0, "occupancy_pct"] == 0
    assert second.loc[0, "occupancy_pct"] == 90


def test_a_failed_page_raises_instead_of_returning_partial_data(
    connect_mock_database,
):
    respond = Mock(side_effect=[
        httpx.Response(200, json=[{
            "id": 1,
            "lot_id": "west",
            "location_id": "sjsu",
            "scraped_at": "2026-09-21T07:00:00Z",
            "occupancy_pct": 0,
        }]),
        httpx.Response(400, json={
            "code": "TEST_FAILURE",
            "message": "Read failed",
            "details": None,
            "hint": None,
        }),
    ])
    connect_mock_database(respond)

    with pytest.raises(APIError) as error:
        data.load_occupancy(START, END)

    assert error.value.code == "TEST_FAILURE"
    assert respond.call_count == 2
