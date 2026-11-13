from datetime import date

import pandas as pd

from ..data.loader import create_lab_client


def load_terms() -> pd.DataFrame:
    client = create_lab_client()
    columns = ["term_id", "term_type", "term_start", "term_end", "instruction_start"]
    records = []
    offset = 0
    while True:
        page = (
            client.table("academic_terms")
            .select(",".join(columns))
            .eq("location_id", "sjsu")
            .order("term_start")
            .order("term_id")
            .range(offset, offset + 499)
            .execute()
        ).data
        if not page:
            break
        records.extend(page)
        offset += len(page)

    terms = pd.DataFrame(records, columns=columns)
    for column in ["term_start", "term_end", "instruction_start"]:
        terms[column] = pd.to_datetime(terms[column]).dt.date
    return terms


def days_until_term_end(target_date: date, term_end: date) -> int:
    """Count calendar days remaining; the term's final date is zero."""
    return (term_end - target_date).days


def days_since_instruction_start(target_date: date, instruction_start: date) -> int:
    """Count calendar days relative to the first scheduled day of classes."""
    return (target_date - instruction_start).days


def calendar_features(target_times: pd.Series, *, terms: pd.DataFrame | None = None) -> pd.DataFrame:
    """Derive features from term ranges; dates beyond stored coverage stay unknown."""
    dates = target_times.dt.tz_convert("America/Los_Angeles").dt.date
    if terms is None:
        terms = load_terms()
    calendar = pd.DataFrame(
        index=pd.Index(dates.unique(), name="date"),
        columns=["calendar", "days_into_calendar", "days_until_term_end", "days_since_instruction_start"],
    )
    terms = terms.sort_values("term_start")
    next_type = {"fall": "winter", "winter": "spring", "spring": "summer", "summer": "fall"}
    term_rows = list(terms.itertuples(index=False))
    for previous, following in zip(term_rows, term_rows[1:]):
        if following.term_type == next_type[previous.term_type]:
            gap = (calendar.index > previous.term_end) & (calendar.index < following.term_start)
            calendar.loc[gap, "calendar"] = "break"

    for term in terms.itertuples(index=False):
        matches = (calendar.index >= term.term_start) & (calendar.index <= term.term_end)
        if calendar.loc[matches, "calendar"].notna().any():
            raise ValueError("Overlapping academic terms need an explicit calendar rule.")
        calendar.loc[matches, "calendar"] = term.term_type
        calendar.loc[matches, "days_into_calendar"] = [
            (target_date - term.term_start).days for target_date in calendar.index[matches]
        ]
        calendar.loc[matches, "days_until_term_end"] = [
            days_until_term_end(target_date, term.term_end) for target_date in calendar.index[matches]
        ]
        calendar.loc[matches, "days_since_instruction_start"] = [
            days_since_instruction_start(target_date, term.instruction_start) for target_date in calendar.index[matches]
        ]

    calendar = calendar.reindex(dates)
    calendar.index = target_times.index
    return calendar
