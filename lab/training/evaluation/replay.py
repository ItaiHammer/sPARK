"""Replay chronological forecasts using the same fitter as the training command."""

from concurrent.futures import ProcessPoolExecutor
import json

import numpy as np
import pandas as pd
from threadpoolctl import threadpool_limits

from ..algorithms.flint_opening import adjust_after_clearing, blend_opening_curve
from ..algorithms.hgb import fit_model
from ..data.preparation import fit_slice, snapshot_inputs
from .metrics import NEAR_FULL, score_predictions


def predict_fit(inputs, labels, targets, parameters):
    with threadpool_limits(limits=4):
        model = fit_model(inputs, labels, parameters=parameters)
        return model.predict(targets).clip(0, 100)


def replay(spec, protocol, scrapes, terms, training, history, first, last, workers):
    excluded = protocol.get("excluded_issue_range")
    selected = history.date.between(first, last)
    if excluded:
        selected &= ~history.date.between(*excluded)
    targets = history.loc[selected].reset_index(drop=True)
    if targets.empty:
        raise ValueError("No observed daytime targets in the requested replay.")
    target_inputs = snapshot_inputs(targets, spec["features"], terms, history)
    fit_weekday = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday").index(
        protocol["refit_day"])
    targets["fit_date"] = targets.date - pd.to_timedelta(
        (targets.date.dt.weekday - fit_weekday) % 7, unit="D")

    fit_rows = {}
    with ProcessPoolExecutor(max_workers=workers) as pool:
        pending = {}
        for fit, indices in targets.groupby("fit_date").groups.items():
            train_x, train_y = fit_slice(training, fit)
            pending[fit] = (indices, pool.submit(
                predict_fit, train_x, train_y, target_inputs.loc[indices], spec["model_parameters"]))
            fit_rows[str(fit.date())] = len(train_y)
        for fit, (indices, prediction) in pending.items():
            targets.loc[indices, "tree_forecast"] = prediction.result()
            print(f"{fit.date()} | {fit_rows[str(fit.date())]:,} training rows | {len(indices):,} targets",
                  flush=True)

    adjustment = spec.get("forecast_adjustment")
    if adjustment == "opening_week":
        starts = pd.to_datetime(terms.loc[terms.term_type.isin(["spring", "fall"]), "instruction_start"])
        targets = adjust_after_clearing(blend_opening_curve(targets, history, starts), scrapes)
    elif adjustment is None:
        targets["forecast"] = targets.tree_forecast
    else:
        raise ValueError(f"Unknown forecast adjustment: {adjustment}")
    return targets, fit_rows


def score_replay(targets, terms):
    groups = {"all": targets, "campus_holidays": targets.loc[targets.is_holiday]}
    opening = pd.Series(False, index=targets.index)
    instruction = targets.is_instruction_day & ~targets.is_holiday & targets.date.dt.weekday.lt(5)
    for term in terms.loc[terms.term_type.isin(["spring", "fall"])].itertuples():
        day = (targets.date - pd.Timestamp(term.instruction_start)).dt.days
        opening |= day.between(0, 13)
        if day.between(0, 13).any():
            prefix = f"{term.term_type}_{term.instruction_start.year}"
            groups[f"{prefix}_first_day"] = targets.loc[instruction & day.eq(0)]
            groups[f"{prefix}_week_1"] = targets.loc[instruction & day.between(0, 6)]
            groups[f"{prefix}_first_two_weeks"] = targets.loc[instruction & day.between(0, 13)]
    ordinary = targets.loc[instruction & ~opening & targets.term_type.isin(["spring", "fall"])
                           & targets.phase.eq("instruction")]
    groups["ordinary_class_days"] = ordinary
    groups.update({f"ordinary/{lot}": group for lot, group in ordinary.groupby("lot_id")})
    rows = []
    for name, group in groups.items():
        actual = group.occupancy_pct.ge(NEAR_FULL)
        predicted = group.forecast.ge(NEAR_FULL)
        errors = group.forecast - group.occupancy_pct
        metrics = (score_predictions(group.occupancy_pct, group.forecast)
                   if len(group) else {"mae_pp": np.nan, "rmse_pp": np.nan})
        rows.append(dict(group=name, slots=len(group), **metrics, bias_pp=errors.mean(),
                         near_full=int(actual.sum()), caught=int((actual & predicted).sum()),
                         false_alarms=int((~actual & predicted).sum())))
    return pd.DataFrame(rows)


def verify_reference(targets, scores, path):
    reference = json.loads(path.read_text(encoding="utf-8"))
    if len(targets) != reference["scored_rows"]:
        raise ValueError("The reference replay has a different number of targets.")
    indexed_scores = scores.set_index("group")
    for group, expected in reference["scorecard"].items():
        np.testing.assert_allclose(indexed_scores.loc[group, list(expected)].astype(float),
                                   list(expected.values()), rtol=0, atol=1e-10, err_msg=group)
    for example in reference["examples"]:
        actual = targets.loc[targets.lot_id.eq(example["lot_id"]) & targets.slot_dt.eq(example["slot_dt"])]
        columns = [name for name in example if name not in ("lot_id", "slot_dt")]
        np.testing.assert_allclose(actual[columns].to_numpy(), [[example[c] for c in columns]],
                                   rtol=0, atol=1e-10, err_msg=example["slot_dt"])
