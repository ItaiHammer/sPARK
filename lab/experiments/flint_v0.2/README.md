<p align="center">
  <img src="../flint_v0.1/icon.svg" alt="Flint rock icon" width="96" height="96">
</p>

<h1 align="center">Flint v0.2</h1>

<p align="center">
  <strong>The 2nd iteration of an early sPARK forecasting model prototype 😱🔥</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/model-Histogram%20Gradient%20Boosting-F97316" alt="Histogram Gradient Boosting">
  <img src="https://img.shields.io/badge/scikit--learn-1.9.1-F7931E?logo=scikitlearn&amp;logoColor=white" alt="scikit-learn 1.9.1">
  <img src="https://img.shields.io/badge/size-7.53%20MiB-64748B" alt="Model size: 7.53 MiB">
  <img src="https://img.shields.io/badge/features-7-3ECF8E" alt="Seven features">
  <img src="https://img.shields.io/badge/status-prototype-blueviolet" alt="Prototype">
</p>

---

<a id="contents"></a>

## Table of Contents

- [📖 About](#about)
- [✨ Features](#features)
- [⚙️ Parameters](#parameters)
- [📚 Training Data](#training-data)
- [📊 Evaluation](#evaluation)
- [📝 Notes](#notes)
- [📦 Model Files](#model-files)

---

<a id="about"></a>

## 📖 About

A parking occupancy forecaster for sPARK, using the features below to predict occupancy from 0-100%.

I tested adding days since classes started to the seven inputs from [Flint v0.1](../flint_v0.1/README.md). The original seven did better on the same August-September dates, so I kept them.

I tuned two tree settings and lowered daytime error from 9.75 to 9.05 points. That version became my baseline for V3.

| Model      | Details                                                   |
| ---------- | --------------------------------------------------------- |
| Name       | `flint_v0.2`                                              |
| Algorithm  | Histogram Gradient Boosting (scikit-learn 1.9.1)          |
| Saved size | 7.53 MiB (7,894,144 bytes) for the original August 31 fit |
| Training   | Python, CPU                                               |
| Status     | Experimental prototype selected on historical validation  |

---

<a id="features"></a>

## ✨ Features

| Feature               | Meaning                                              |
| --------------------- | ---------------------------------------------------- |
| `lot_id`              | Which parking lot to predict                         |
| `weekday`             | Day of the week, Monday = 0 through Sunday = 6       |
| `minute_of_day`       | Time of day as minutes since midnight                |
| `is_us_holiday`       | Whether the date is an observed U.S. federal holiday |
| `calendar`            | Academic term type, or break                         |
| `days_into_calendar`  | Days since the academic term started                 |
| `days_until_term_end` | Days remaining until the academic term ends          |

Dates use Pacific time. Term day counts are missing during breaks. The model treats `lot_id` and `calendar` as categories. [Term dates](supporting_experiments/recipe_selection/academic_terms.csv).

---

<a id="parameters"></a>

## ⚙️ Parameters

| Parameter                        |             Value |
| -------------------------------- | ----------------: |
| Trees (`max_iter`)               |             1,000 |
| Learning rate                    |              0.01 |
| Maximum leaves per tree          |                60 |
| Minimum samples per leaf         |                20 |
| L2 regularization                |               1.0 |
| Maximum numeric bins             |               255 |
| Maximum tree depth               |         Unlimited |
| Features available at each split |              100% |
| Categorical handling             | From input dtypes |
| Early stopping                   |          Disabled |
| Loss                             |     Squared error |
| Random seed                      |                42 |

I lowered the minimum leaf size from 50 to 20 and raised L2 from 0 to 1. [Full configuration](metadata.json).

---

<a id="training-data"></a>

## 📚 Training Data

I trained on historical occupancy from Supabase's `lot_occupancy` table for SJSU's four garages. The label (`y`) is `occupancy_pct` on a **0 to 100 scale**.

I rounded scrapes to half-hours and kept the latest reading per garage and slot. I removed values outside 0-100 and excluded the April 9, 2026 at 11:00 through April 22 at 12:00 Pacific feed freeze. Training and validation included overnight readings.

| Set              | Dates included, Pacific              | Prepared examples |
| ---------------- | ------------------------------------ | ----------------: |
| Training Set     | October 21, 2025 to August 30, 2026  |            55,283 |
| Validation Set   | August 31 to September 20, 2026      |             3,696 |
| Independent Test | Pending                              |               N/A |

I fit the model before the validation window and kept its weights fixed while comparing inputs and settings.

---

<a id="evaluation"></a>

## 📊 Evaluation

Errors are in **occupancy percentage points**. Here $y_i$ is actual occupancy, $\hat{y}_i$ is predicted occupancy, and $n$ is the number of predictions.

### MAE: Mean Absolute Error

$$
\mathrm{MAE} = \frac{1}{n}\sum_{i=1}^{n}\left|\hat{y}_i-y_i\right|
$$

> Average the absolute errors. I use MAE to check the five-point target.

### RMSE: Root Mean Squared Error

$$
\mathrm{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^{n}\left(\hat{y}_i-y_i\right)^2}
$$

> Square the errors, average them, then take the square root. RMSE gives larger errors more weight.

### Model Scores

Results for the fixed August 31 fit on the **August 31 to September 20, 2026 validation set**.

- **All hours** covers all 3,696 valid recorded slots.
- **Daytime** covers 07:00-21:30 Pacific, inclusive (2,340 predictions).

**Totals across all garages**

| Window    |   MAE |   RMSE |
| --------- | ----: | -----: |
| All hours | 8.516 | 13.494 |
| Daytime   | 9.046 | 15.290 |

**Results by garage**

| Garage       | All-hours MAE | All-hours RMSE | Daytime MAE | Daytime RMSE |
| ------------ | ------------: | -------------: | ----------: | -----------: |
| North        |         8.351 |         12.483 |       8.090 |       13.982 |
| South        |        13.735 |         18.834 |      13.512 |       20.973 |
| South Campus |         5.195 |          8.540 |       7.164 |        9.779 |
| West         |         6.784 |         12.035 |       7.419 |       14.288 |

Daytime error was above five points at every garage. South had the largest errors. [Evaluation record](evaluation.json).

### Supporting experiments

#### Did days since instruction began improve the forecast?

On the same dates and settings, daytime MAE was **9.927** with eight inputs and **9.746** with seven.

#### Which tree settings helped?

| Minimum samples per leaf |  L2 | Daytime MAE | Daytime RMSE |
| -----------------------: | --: | ----------: | -----------: |
|                       50 |   0 |       9.746 |       15.664 |
|                       20 |   0 |       9.162 |       15.310 |
|                       50 |   1 |       9.339 |   **15.112** |
|                       20 |   1 |   **9.046** |       15.290 |

I selected the settings with the lowest daytime MAE. [Full recipe-selection report](supporting_experiments/recipe_selection/README.md).

---

<a id="notes"></a>

## 📝 Notes

- **Labor Day was a weak spot.** I used the August 31 model throughout the three-week validation window. On Labor Day, its daytime forecasts were off by **45.494 occupancy points** on average.
- **The weekly replay compared V2 and V3 on the same dates.** I refit each model on Sundays using earlier readings and scored both on the same **32,135 daytime slots**. V2 averaged **8.463 points** of error. In the first week of fall classes, it averaged **13.594 points** and caught **94 of 154** readings at or above **93% occupancy**. [Replay protocol](../flint_v0.3/supporting_experiments/weekly_replay/README.md).
- **I chose V2's settings during validation.** I used the August 31 to September 20 results to pick the model. V1's original scores came from different weeks.

---

<a id="model-files"></a>

## 📦 Model Files

| File                                                                                 | Contents                                                    |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `README.md`                                                                          | Model overview, training dates, and interpretation          |
| [metadata.json](metadata.json)                                                       | Selected feature order and tree settings                    |
| [evaluation.json](evaluation.json)                                                   | Original validation results and artifact identity           |
| [supporting_experiments/recipe_selection/](supporting_experiments/recipe_selection/) | Feature and parameter comparisons and the term snapshot     |
| `lab/local_experiments/flint_v0.2/runs/<run>/model.joblib`                           | Fitted weights produced by training                         |
| `lab/local_experiments/flint_v0.2/runs/<run>/metadata.json`                          | Generated receipt with source, calendar, cutoff, and hashes |
| `lab/local_experiments/flint_v0.2/runs/<run>/predictions.csv.gz` and `scorecard.csv` | Generated weekly replay outputs                             |

Use the [lab commands](../../README.md#running-experiments) with `--recipe flint_v0.2` and `--fit 2026-08-31` to train at the original cutoff.

[Back to top](#contents)
