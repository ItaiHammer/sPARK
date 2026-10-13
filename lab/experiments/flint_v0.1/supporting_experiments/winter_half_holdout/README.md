# Does learning a semester's occupancy pattern help predict the rest of that semester?

**Question:** does seeing the beginning of a semester help the model predict the rest of it? We compare training on other semesters alone against adding the first half of winter, then evaluate both on winter's second half.

## Setup

- **Recipe:** the saved `flint_v0.1` feature list and parameters, fitted as two separate models. The official artifact was unchanged.
- **Model A:** fall, spring, and summer observations from `October 21, 2025` to `September 20, 2026` (a 335-day window). Breaks and winter were excluded.
- **Model B:** the same data, plus winter observations from `December 22, 2025` to `January 3, 2026` (13 days, just under two weeks; 2,460 added examples).
- **Shared evaluation:** `January 4, 2026` to `January 16, 2026` (13 days; 2,424 examples, including 1,516 daytime).
- **Scoring:** occupancy percentage points; daytime is 07:00–21:30 Pacific. Only valid observed slots were scored.

All dates include the full day in Pacific time. The winter term was split into two equal 13-calendar-day halves. No second-half winter outcomes were used for training, and no updates were made during evaluation.

## Results

| Training data | Examples | All-hours MAE | Daytime MAE | Daytime RMSE | Predicted daytime average |
| ------------- | -------: | ------------: | ----------: | -----------: | ------------------------: |
| Fall + spring + summer | 49,736 | 14.704 | 19.616 | 25.621 | 35.74% |
| Same + first half of winter | 52,196 | 4.350 | 5.594 | 8.782 | 12.99% |

**Actual daytime average: 16.84%.** Adding winter examples substantially reduced overprediction, although the second model underestimated average occupancy and its daytime MAE remained above five points.

**Interpretation:** data from other semesters did not replace winter-specific examples in this comparison. Include available winter history and evaluate performance by semester.

## Limits

- Spring and summer observations occurred after the winter test dates. This is a retrospective semester holdout, not an operational forecasting backtest.
- Adding winter also increases the training set. Both models retain calendar features, so this does not isolate the calendar feature's contribution or establish next-year accuracy.
- The first half includes the December 25–January 1 campus closure. The halves are equal calendar periods, not equivalent instruction periods.
- These results describe separately fitted models, not the official saved Flint artifact.

Winter bounds were verified against the [SJSU 2025–2026 academic calendar](https://www2.sjsu.edu/classes/calendar/2025-2026.php) and [Winter 2026 class schedule](https://www2.sjsu.edu/classes/schedules/archive/winter-2026.php).

## Records

- [results.csv](results.csv): overall comparison, including mean occupancy and signed bias.
- [summary.json](summary.json): exact all-hours, daytime, and per-garage scores.
- [academic_terms.csv](academic_terms.csv): the calendar snapshot used to derive features.
- `other_terms_only/` and `other_terms_plus_first_half_winter/`: each model's features, parameters, training composition, dates, and evaluation records.

The fitted comparison models and individual predictions remain local in `lab/local_experiments/flint_v0.1/comparisons/other-terms-winter-20261011T064137884040Z/`. Both saved models reproduced their recorded predictions and scores; both used exactly the same test outcomes as the earlier fall-only comparison.
