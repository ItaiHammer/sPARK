import pandas as pd
import pytest

from training.algorithms.flint_opening import adjust_after_clearing, blend_opening_curve
from training.data.preparation import observations_for_training
from training.features.history import history_features
from training.recipes import load_recipe


def slots(values):
    times = pd.to_datetime([time for time, _ in values], format="mixed")
    return pd.DataFrame({
        "lot_id": "west", "slot_dt": times, "date": times.normalize(),
        "slot": times.hour * 2 + times.minute // 30, "occupancy_pct": [value for _, value in values],
        "term_type": "fall", "phase": "instruction", "is_instruction_day": True, "is_holiday": False,
    })


def test_selected_recipes_keep_the_parent_settings():
    v1, v2, v3 = (load_recipe(f"flint_v0.{version}") for version in (1, 2, 3))
    assert len(v1["features"]) == 7
    assert v2["features"] == v1["features"]
    assert v3["features"] == v2["features"] + ["recent_same_regime_slot", "lag_7"]
    assert v3["model_parameters"] == v2["model_parameters"]
    assert v1["model_parameters"]["min_samples_leaf"] == 50
    assert v3["model_parameters"]["min_samples_leaf"] == 20
    assert v3["forecast_adjustment"] == "opening_week"


def test_training_keeps_both_utc_slots_in_the_repeated_pacific_hour():
    scrapes = pd.DataFrame({
        "lot_id": "west", "occupancy_id": [1, 2, 3],
        "scraped_at": pd.to_datetime(["2025-11-02T07:57Z", "2025-11-02T08:57Z", "2025-11-02T08:59Z"]),
        "slot_dt": pd.Timestamp("2025-11-02 01:00"),
    })
    scrapes["target_time"] = scrapes.scraped_at.dt.round("30min")
    kept = observations_for_training(scrapes, pd.Timestamp("2025-10-21"))
    assert kept.occupancy_id.tolist() == [1, 3]


def test_holiday_history_matches_status_and_excludes_the_target_day():
    panel = slots([("2026-08-31 12:00", 96), ("2026-09-05 12:00", 3),
                   ("2026-09-06 12:00", 1), ("2026-09-07 12:00", 99)])
    panel.loc[1:, "is_instruction_day"] = False
    panel.loc[3, "is_holiday"] = True
    result = history_features(panel).iloc[-1]
    assert result.recent_same_regime_slot == 2
    assert result.lag_7 == 96


def test_opening_uses_only_prior_terms_and_tapers_with_completed_days():
    history = slots([("2026-01-22 09:30", 91), ("2026-01-23 09:30", 33),
                     ("2026-01-26 09:30", 100), ("2026-01-27 09:30", 93),
                     ("2026-01-28 09:30", 96), ("2026-08-19 09:30", 100),
                     ("2026-08-20 09:30", 40), ("2026-09-01 09:30", 50)])
    history.loc[:4, "term_type"] = "spring"
    starts = pd.Series(pd.to_datetime(["2026-01-22", "2026-08-19"]))
    targets = history.iloc[[0, 5, 6, 7]].assign(tree_forecast=20.0)
    result = blend_opening_curve(targets, history, starts)
    assert result.opening_forecast.tolist() == [20, 94.5, 57.25, 20]
    assert result.opening_curve_weight.tolist() == [0, 1, 0.5, 0]


def test_clearing_ignores_a_scrape_that_arrived_after_issue():
    day = slots([("2026-08-19 15:00", 96), ("2026-08-19 15:30", 89),
                 ("2026-08-19 16:00", 89), ("2026-08-19 16:30", 10), ("2026-08-19 17:00", 75)])
    targets = day.assign(opening_forecast=100.0, opening_curve_weight=1.0)
    scrapes = day.assign(local_timestamp=day.slot_dt + pd.Timedelta(seconds=5))
    result = adjust_after_clearing(targets, scrapes).iloc[-1]
    assert result.forecast == pytest.approx(89)
    assert result.clearing_reading_at == pd.Timestamp("2026-08-19 16:00:05")
    assert result.clearing_issue_at == pd.Timestamp("2026-08-19 16:30")
