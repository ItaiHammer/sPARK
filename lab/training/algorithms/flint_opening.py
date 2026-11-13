"""Flint v0.3's opening-week curve and 30-minute clearing update."""

import numpy as np
import pandas as pd

from ..evaluation.metrics import NEAR_FULL


SLOT = ["lot_id", "slot"]


def opening_slots(rows: pd.DataFrame, starts: pd.Series) -> pd.DataFrame:
    """Mark instructional weekdays in calendar days 0-6 after classes begin."""
    frame = rows.copy()
    frame["friday"] = frame.date.dt.weekday.eq(4)
    frame["opening_term"] = pd.NaT
    eligible = frame.is_instruction_day & ~frame.is_holiday & frame.date.dt.weekday.lt(5)
    for start in starts:
        frame.loc[eligible & (frame.date - start).dt.days.between(0, 6), "opening_term"] = start
    return frame


def blend_opening_curve(targets: pd.DataFrame, history: pd.DataFrame, starts: pd.Series) -> pd.DataFrame:
    """Give the prior-term median the weight of one completed class day."""
    targets = opening_slots(targets, starts)
    history = opening_slots(history, starts)
    targets["opening_curve"] = np.nan
    targets["opening_curve_weight"] = 0.0
    targets["opening_forecast"] = targets.tree_forecast
    for start, opening in targets.loc[targets.opening_term.notna()].groupby("opening_term"):
        prior = history.loc[history.opening_term.add(pd.Timedelta(days=6)).lt(start)]
        keys = SLOT + ["friday"]
        term_medians = prior.groupby(keys + ["opening_term"]).occupancy_pct.median()
        profile = term_medians.groupby(level=keys).median().rename("opening_curve")
        for issue, day in opening.groupby("date"):
            earlier = history.loc[history.opening_term.eq(start) & history.date.lt(issue)]
            completed = earlier.groupby(SLOT).date.nunique()
            estimate = day[keys].join(profile, on=keys).opening_curve
            count = pd.MultiIndex.from_frame(day[SLOT]).map(completed).fillna(0)
            weight = np.where(estimate.notna(), 1 / (1 + count), 0)
            targets.loc[day.index, "opening_curve"] = estimate
            targets.loc[day.index, "opening_curve_weight"] = weight
            targets.loc[day.index, "opening_forecast"] = (
                day.tree_forecast + weight * (estimate.fillna(day.tree_forecast) - day.tree_forecast)
            )
    return targets


def adjust_after_clearing(targets: pd.DataFrame, scrapes: pd.DataFrame) -> pd.DataFrame:
    """Adjust a batch of opening forecasts using readings before each target's issue.

    Include earlier unadjusted forecasts for the same garage and day in targets.
    The correction compares completed slots with those forecasts at matching times.
    """
    targets = targets.copy()
    targets["forecast"] = targets.opening_forecast
    targets["clearing_points"] = 0.0
    targets["clearing_reading_at"] = pd.NaT
    targets["clearing_issue_at"] = pd.NaT
    opening = targets.loc[targets.opening_curve_weight.gt(0)]
    for (day, lot), rows in opening.groupby(["date", "lot_id"]):
        day_forecasts = targets.loc[targets.date.eq(day) & targets.lot_id.eq(lot)]
        blended_by_slot = day_forecasts.set_index("slot_dt").opening_forecast
        available = scrapes.loc[
            scrapes.date.eq(day) & scrapes.lot_id.eq(lot) & scrapes.slot_dt.isin(blended_by_slot.index)
        ]
        for row in rows.itertuples():
            issue = row.slot_dt - pd.Timedelta(minutes=30)
            targets.at[row.Index, "clearing_issue_at"] = issue
            before_issue = available.loc[available.local_timestamp.lt(issue)
                                         & available.slot_dt.lt(row.slot_dt)]
            completed = before_issue.groupby("slot_dt").agg(
                observed=("occupancy_pct", "mean"), scraped_at=("local_timestamp", "max"))
            latest = completed.tail(3)
            consecutive = latest.index.to_series().diff().iloc[1:].eq(pd.Timedelta(minutes=30)).all()
            if len(latest) < 2 or not consecutive:
                continue
            last_reading = latest.scraped_at.max()
            if issue - last_reading > pd.Timedelta(hours=1):
                continue
            recent = latest.observed.tail(2)
            earlier = completed.loc[completed.index < recent.index[0], "observed"]
            if not (recent.lt(NEAR_FULL).all() and earlier.ge(NEAR_FULL).any()):
                continue
            errors = latest.observed - blended_by_slot.reindex(latest.index)
            correction = float(np.clip(errors.median(), -20, 0))
            if correction < 0:
                targets.at[row.Index, "forecast"] = np.clip(row.opening_forecast + correction, 0, 100)
                targets.at[row.Index, "clearing_points"] = correction
                targets.at[row.Index, "clearing_reading_at"] = last_reading
    return targets
