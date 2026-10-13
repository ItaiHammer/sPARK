from datetime import datetime
from functools import cache
from pathlib import Path

import pandas as pd
from dotenv import dotenv_values
from supabase import Client, create_client


@cache
def create_lab_client() -> Client:
    settings = dotenv_values(Path(__file__).resolve().parents[1] / ".env.lab")
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
