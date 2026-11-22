from __future__ import annotations

from datetime import datetime
from functools import cache
from pathlib import Path
from typing import TYPE_CHECKING

import pandas as pd

if TYPE_CHECKING:
    from supabase import Client


SNAPSHOT_COLUMNS = [
    "occupancy_id", "location_id", "lot_id", "scraped_at", "occupancy_pct",
    "term_type", "phase", "is_instruction_day", "is_holiday",
]


@cache
def create_lab_client() -> Client:
    from dotenv import dotenv_values
    from supabase import create_client

    settings = dotenv_values(Path(__file__).resolve().parents[2] / ".env.lab")
    return create_client(settings["SUPABASE_URL"], settings["SUPABASE_KEY"])


def load_occupancy(start: datetime, end: datetime) -> pd.DataFrame:
    """Load all lots between timezone-aware dates: start inclusive, end exclusive."""
    client = create_lab_client()
    columns = "id,lot_id,location_id,scraped_at,occupancy_pct"
    records = []
    offset = 0

    while True:
        response = (
            client.table("lot_occupancy")
            .select(columns)
            .gte("scraped_at", start.isoformat())
            .lt("scraped_at", end.isoformat())
            .order("id")
            .range(offset, offset + 499)
            .execute()
        )
        page = response.data
        if not page:
            break

        records.extend(page)
        offset += len(page)

    frame = pd.DataFrame(records, columns=columns.split(","))
    frame["scraped_at"] = pd.to_datetime(frame["scraped_at"], utc=True, format="mixed")
    frame["occupancy_pct"] = pd.to_numeric(frame["occupancy_pct"])
    return frame.sort_values(["scraped_at", "lot_id", "id"]).reset_index(drop=True)


def load_snapshot(path: Path) -> pd.DataFrame:
    """Read a private snapshot of SJSU scrapes joined to the academic calendar."""
    frame = pd.read_csv(path, usecols=SNAPSHOT_COLUMNS)
    frame = frame.loc[frame.location_id.eq("sjsu")].copy()
    if frame.empty:
        raise ValueError("The snapshot has no SJSU observations.")
    frame["occupancy_pct"] = pd.to_numeric(frame.occupancy_pct, errors="coerce")
    frame["scraped_at"] = pd.to_datetime(frame.scraped_at, utc=True, format="mixed")
    if frame.scraped_at.isna().any():
        raise ValueError("Every scrape needs a timestamp.")
    for name in ("is_instruction_day", "is_holiday"):
        values = frame[name].astype("str").str.lower().map(
            {"true": True, "false": False, "1": True, "0": False}
        )
        if values.isna().any():
            raise ValueError(f"The snapshot needs a known calendar value for {name}.")
        frame[name] = values.astype(bool)
    return frame


def load_term_snapshot(path: Path) -> pd.DataFrame:
    terms = pd.read_csv(path)
    for column in ("term_start", "term_end", "instruction_start"):
        terms[column] = pd.to_datetime(terms[column]).dt.date
    return terms
