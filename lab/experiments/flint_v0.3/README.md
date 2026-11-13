<p align="center">
  <img src="../flint_v0.1/icon.svg" alt="Flint rock icon" width="96" height="96">
</p>

<h1 align="center">Flint v0.3</h1>

<p align="center">
  <strong>The third iteration of an early sPARK forecasting model prototype 😱🔥</strong>
</p>

---

## Table of Contents

- [📖 About](#about)
- [✨ Features](#features)
- [🎓 Opening Week](#opening-week)
- [📊 Evaluation](#evaluation)
- [⚙️ Reproduce](#reproduce)

---

<a id="about"></a>

## 📖 About

Flint predicts **0-100% occupancy** for an SJSU garage at a given time. [V2](../flint_v0.2/README.md) overpredicted on Labor Day and underpredicted on fall's first day of classes. I added two occupancy-history inputs and an opening-week adjustment to address those cases. The [beta package](../../models/flint_v0.3/README.md) uses this experiment's frozen trees.

```text
9 inputs -> Boosted trees -> Occupancy prediction -> Opening-week adjustment when applicable
```

<a id="features"></a>

## ✨ Features

| Group | Input | Meaning |
| --- | --- | --- |
| Garage and time | `lot_id` | Garage, such as West or South |
| | `weekday` | Monday = 0, Sunday = 6 |
| | `minute_of_day` | Minutes since midnight Pacific |
| Calendar | `is_us_holiday` | Observed U.S. federal holiday |
| | `calendar` | Academic term type or break |
| | `days_into_calendar` | Days since the term began |
| | `days_until_term_end` | Days until the term ends |
| Occupancy history | `recent_same_regime_slot` | Average at this garage and time on comparable days in the prior 14 days |
| | `lag_7` | Occupancy at this garage and time exactly seven days earlier |

The trees treat the garage and term type as categories. The term can start before instruction. For fall 2026, the term started **August 17** and classes started **August 19**. The trees saw **2 days into the term** on August 19. The opening adjustment saw **day one of classes**.

### Labor Day at South Garage, noon

A comparable date matches the **term type, academic phase, and whether classes were in session**. Labor Day was a no-class day during fall instruction. Four days in the 14-day window matched and had a noon reading. [History code](../../training/features/history.py)

| Input | Readings | Value the trees saw |
| --- | --- | ---: |
| Comparable days | Aug 29: 2%, Aug 30: 2%, Sep 5: 3%, Sep 6: 1% | **2%** |
| Same time last week | Aug 31: 96% on a class day | **96%** |

The trees predicted **6.32%**. Actual occupancy was **1%**. [Replay example](evaluation.json)

<a id="opening-week"></a>

## 🎓 Opening Week

The window starts on the **first day of instruction** and runs for seven calendar days. On class weekdays in that window, Flint can blend the tree prediction with an **opening curve**. The curve is a table of typical occupancy by garage and half-hour, built from earlier spring or fall openings. Fridays have their own curve. [How the curve is built](supporting_experiments/weekly_replay/README.md#opening-week-method)

```text
Aug 2025 fall opening -> Before the occupancy archive starts
Jan 2026 spring opening -> No earlier opening in the archive -> Trees alone
Aug 2026 fall opening -> January's opening is available -> Trees + curve
```

At **West Garage at 9:30 a.m.**, the spring readings from Jan 22, 26, 27, and 28 were **91%, 100%, 93%, and 96%**. The median was **94.5%**, halfway between 93% and 96%.

| Fall forecast | Earlier class days with a 9:30 reading | Tree forecast | Curve weight | Blended forecast |
| --- | ---: | ---: | ---: | ---: |
| Aug 19 | 0 | 22.01% | 100% | **94.50%** |
| Aug 20 | 1 | 99.61% | 50% | **97.05%** |

The curve gets one share. The trees get one share per earlier class day with a reading for that garage and slot. Two usable days bring the curve's share to one-third. When the curve is missing, Flint uses the trees alone.

**Clearing update.** If readings available at issue time show that the garage reached 93% and then dropped below it for two consecutive slots, Flint can lower the blended forecast. At South Garage, the readings **96% -> 89% -> 89%** were available before 4:30 p.m. The update lowered the 5 p.m. forecast from **100% to 89%**, and actual occupancy was **75%**. [Clearing rule and replay results](supporting_experiments/weekly_replay/README.md)

### Forecasts days ahead

For a forecast issued Monday for Wednesday noon, the model can use **last Wednesday at noon**. This Tuesday at noon and this Wednesday morning are still in the future. The forecast's issue time sets the cutoff for history. The clearing update can run during Wednesday's refresh as readings arrive. Multi-day accuracy needs a separate replay with those earlier cutoffs.

<a id="evaluation"></a>

## 📊 Evaluation

I refit both recipes on 41 historical Sundays using earlier readings. The same-day replay scored **32,135** observed half-hours from **December 14, 2025 to October 1, 2026**, excluding June 22-27. It covers **7 a.m. to 9:30 p.m. Pacific**. Average error (MAE) is in occupancy percentage points. A near-full slot is **93% occupied or higher**. [Replay protocol](supporting_experiments/weekly_replay/README.md)

| Window | V2 MAE | V3 MAE | Near-full slots caught, V2 -> V3 |
| --- | ---: | ---: | ---: |
| All daytime slots | 8.46 | **5.57** | 1,631 -> 1,668 / 2,193 |
| Ordinary class days | 6.46 | **4.11** | 1,191 -> 1,253 / 1,531 |
| Campus holidays | 15.01 | **4.77** | No observed near-full slots |
| Spring week one | **8.32** | 20.04 | 78 -> 17 / 154 |
| Fall day one | 23.01 | **7.45** | 0 -> 33 / 37 |
| Fall week one | 13.59 | **7.78** | 94 -> 130 / 154 |

**Spring limitation.** With no earlier opening curve, V3 caught **0 of 34** near-full slots on spring's first day and **17 of 154** that week. The clearing rule was chosen after examining the fall replay. A fresh opening and longer forecast leads still need validation. [Reference scores](evaluation.json)

<details>
<summary>Results by garage and scoring details</summary>

| Garage | Observed slots | V2 MAE | V2 RMSE | V3 MAE | V3 RMSE | V3 near-full catches | V3 false alarms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| North | 8,034 | 8.858 | 16.036 | 5.501 | 9.332 | 641 / 788 | 54 |
| South | 8,034 | 10.246 | 18.834 | 6.134 | 10.893 | 667 / 838 | 102 |
| South Campus | 8,033 | 5.592 | 10.214 | 4.759 | 9.416 | 0 / 13 | 0 |
| West | 8,034 | 9.158 | 15.839 | 5.905 | 10.138 | 360 / 554 | 53 |

Ordinary class days exclude the first 14 calendar days of spring and fall. Across the full replay, V2 to V3 RMSE was **15.511 -> 9.965**, signed bias was **+1.895 -> -0.035**, and false alarms were **386 -> 209**.

For error $e_i = \hat{y}_i-y_i$, $\mathrm{MAE}=\frac{1}{n}\sum_i |e_i|$, $\mathrm{RMSE}=\sqrt{\frac{1}{n}\sum_i e_i^2}$, and $\mathrm{Bias}=\frac{1}{n}\sum_i e_i$. A catch means both prediction and actual are at least 93%. A false alarm means only the prediction is at least 93%.

</details>

<a id="reproduce"></a>

## ⚙️ Reproduce

The frozen checkpoint uses **58,795** SJSU occupancy readings from October 21, 2025 through September 19, 2026. The tree settings were inherited from V2, including **1,000 trees**, a **0.01 learning rate**, **60 max leaves**, **20 minimum samples per leaf**, and **1.0 L2 regularization**. See the [beta metadata](../../models/flint_v0.3/metadata.json) for the full settings and checksum, and the [recipe](metadata.json) for replay dates and source hashes.

Set up Python 3.13 with the [lab dependencies](../../requirements.txt). Run these commands from the repository root with the private reference snapshot and the included [term calendar](../flint_v0.2/supporting_experiments/recipe_selection/academic_terms.csv). If the snapshot lives elsewhere, pass its path to `--snapshot`.

```powershell
python -m pip install -r lab/requirements.txt
python -m lab.training.train train --recipe flint_v0.3 --snapshot lab/local_experiments/parking_snapshot.csv.gz --fit 2026-09-20
python -m lab.training.train replay --recipe flint_v0.3 --snapshot lab/local_experiments/parking_snapshot.csv.gz --workers 4
```

The snapshot contains garage IDs, timestamps, occupancy, term type, academic phase, and class-day and holiday flags. The lab rounds readings to half-hours in UTC, discards invalid readings and the April 9-22 feed freeze, and retains the highest observation ID per slot for training. History and scoring average valid duplicates. Both commands save outputs under `lab/local_experiments/flint_v0.3/runs/`. The replay's `predictions.csv.gz` includes the curve value, its weight, and the final forecast.

For the V1 or V2 snapshot workflow, use `--recipe flint_v0.1` or `--recipe flint_v0.2`. The [trainer](../../training/train.py) also supports the database workflow with `--start`, `--split`, and `--end`.
