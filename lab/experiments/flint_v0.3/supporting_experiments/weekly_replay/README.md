# Flint v0.3 weekly replay

Refit both recipes on the same Sundays using only earlier outcomes. Score the same observed daytime half-hours from Dec 14, 2025 through Oct 1, 2026. The Jun 22-27 gap preserves the original research split. The reference snapshot SHA-256 and dates are in [metadata.json](../../metadata.json).

## Does recent occupancy help on holidays?

On 14 campus-holiday dates, MAE went from 15.01 to 4.77 and false near-full warnings went from 33 to zero. Labor Day alone improved from 43.89 to 3.06. At South Garage at noon, the two history inputs were 2% from comparable days and 96% from the previous Monday. The trees predicted 6.3175% against 1% observed.

## Does the opening curve help when classes resume?

| Fall opening variant | Day-one MAE | Day-one catches | Week-one MAE | Week-one catches | Week-one false alarms |
| --- | ---: | ---: | ---: | ---: | ---: |
| v0.2 calendar only | 23.01 | 0 / 37 | 13.59 | 94 / 154 | 9 |
| Nine inputs | 39.40 | 0 / 37 | 14.73 | 94 / 154 | 10 |
| Add opening curve | 8.92 | 33 / 37 | 8.63 | 130 / 154 | 18 |
| Add clearing update | 7.45 | 33 / 37 | 7.78 | 130 / 154 | 9 |

At West Garage on Aug 19 at 09:30, the trees predicted 22.0129%. The prior-opening curve set the forecast to 94.5% against 100% observed. At South Garage at 17:00 that day, the clearing update lowered the curve from 100% to 89% against 75% observed. These are replay cases, with updates using only scrapes strictly before the simulated issue.

The archive starts after Fall 2025's opening. Spring 2026 had zero prior opening weeks available, and the two history inputs hurt its opening forecasts. The clearing rule was chosen after examining this fall replay. Validate it on a fresh opening before promoting the model.

## Opening-week method

Both adjustments apply to instructional weekdays in the first seven calendar days of spring or fall classes.

1. **Opening curve.** Take the median occupancy for the same garage and half-hour in each prior opening, then the median across terms. Fridays use a separate curve. With $d$ completed opening-week class days that have a reading for the same garage and slot, give the curve weight $w=1/(1+d)$. Blend the tree prediction $T$ and curve $C$ as $(1-w)T+wC$. If the curve is unavailable, use $T$.
2. **Clearing update.** For a forecast issued 30 minutes before its target, look for a reading of at least 93% followed by two consecutive readings below 93%. Use the latest two or three consecutive readings from before the issue, with the latest at most one hour old. The correction is the median of actual minus blended forecast at those slots, limited to a drop of at most 20 points. Clamp the result to 0-100%.

[Opening adjustment code](../../../../training/algorithms/flint_opening.py).

[Back to Flint v0.3](../../README.md)  |  [Reproduction commands](../../README.md#reproduce).
