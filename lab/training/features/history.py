"""Occupancy inputs calculated from completed days."""

import numpy as np
import pandas as pd


SLOT_KEYS = ["lot_id", "slot_dt"]
HISTORY_FEATURES = ("recent_same_regime_slot", "lag_7")


def history_features(panel: pd.DataFrame) -> pd.DataFrame:
    """Build occupancy inputs from dates strictly before each target date."""
    dates = pd.date_range(panel.date.min(), panel.date.max(), freq="D")
    calendar = panel.drop_duplicates("date").set_index("date").reindex(dates)
    term = calendar.term_type.fillna("unknown").to_numpy()
    phase = calendar.phase.fillna("unknown").to_numpy()
    instruction = (calendar.is_instruction_day.eq(True) & calendar.is_holiday.eq(False)).to_numpy()
    output = []
    for _, lot in panel.groupby("lot_id", sort=False):
        grid = (lot.pivot(index="date", columns="slot", values="occupancy_pct")
                .reindex(index=dates, columns=range(48)).to_numpy(float))
        recent = np.full_like(grid, np.nan)
        lag = np.full_like(grid, np.nan)
        lag[7:] = grid[:-7]
        for day in range(1, len(dates)):
            prior = np.arange(max(0, day - 14), day)
            same = ((term[prior] == term[day]) & (phase[prior] == phase[day])
                    & (instruction[prior] == instruction[day]))
            readings = grid[prior[same]]
            count = np.isfinite(readings).sum(axis=0)
            np.divide(np.nansum(readings, axis=0), count, out=recent[day], where=count > 0)
        indices = (lot.date - dates[0]).dt.days.to_numpy()
        slots = lot.slot.to_numpy()
        output.append(lot.assign(recent_same_regime_slot=recent[indices, slots], lag_7=lag[indices, slots]))
    return pd.concat(output, ignore_index=True).sort_values(
        ["date", "slot", "lot_id"]).reset_index(drop=True)
