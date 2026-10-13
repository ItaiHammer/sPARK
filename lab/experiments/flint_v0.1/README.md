<p align="center">
  <img src="./icon.svg" alt="Flint rock icon" width="96" height="96">
</p>

<h1 align="center">Flint v0.1</h1>

<p align="center">
  <strong>An early sPARK forecasting model prototype 😱🔥</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/model-Histogram%20Gradient%20Boosting-F97316" alt="Histogram Gradient Boosting">
  <img src="https://img.shields.io/badge/scikit--learn-1.9.1-F7931E?logo=scikitlearn&amp;logoColor=white" alt="scikit-learn 1.9.1">
  <img src="https://img.shields.io/badge/size-7.62%20MiB-64748B" alt="Model size: 7.62 MiB">
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
- [📊 Evaluation Results](#evaluation)
- [📝 Notes](#notes)
- [📦 Model Files](#model-files)

---

<a id="about"></a>

## 📖 About

A parking occupancy forecaster for sPARK, using a lot and target time to predict occupancy from 0–100%.

| Model      | Details                                                    |
| ---------- | ---------------------------------------------------------- |
| Name       | flint_v0.1                                                 |
| Algorithm  | Histogram Gradient Boosting (scikit-learn)                 |
| Saved size | 7.62 MiB (7,992,352 bytes)                                 |
| Training   | Python, CPU                                                |
| Status     | Promising in limited [local validation tests](#evaluation) |

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

Dates use Pacific time. Academic term features come from the `academic_terms` table in the db; term-relative numbers are missing during breaks. This artifact uses these seven features, without weather, recent occupancy, or `days_since_instruction_start`.

---

<a id="parameters"></a>

## ⚙️ Parameters

| Parameter                |         Value |
| ------------------------ | ------------: |
| Trees (`max_iter`)       |         1,000 |
| Learning rate            |          0.01 |
| Maximum leaves per tree  |            60 |
| Minimum samples per leaf |            50 |
| L2 regularization        |           0.0 |
| Early stopping           |      Disabled |
| Loss                     | Squared error |
| Random seed              |            42 |

Full configuration: [metadata.json](metadata.json).

---

<a id="training-data"></a>

## 📚 Training Data

The data used for training is **historical occupancy from Supabase's `lot_occupancy` table** for SJSU's North, South, South Campus, and West garages. Occupancy data is collected at a frequency of 30-minute intervals, with one reading recorded per garage at each interval.

The label (`y`) is `occupancy_pct`, represented on a **0 to 100 scale**: a raw value of `80` means `80%` occupied.

Preparation data workflows remove missing occupancy values, values outside the 0 to 100 range, and the known frozen-data interval from April 9, 2026 at 11:00 through April 22 at 12:00 Pacific. When multiple valid readings share a slot, the latest one is kept.

| Set            | Dates included, Pacific                      | Prepared examples |
| -------------- | -------------------------------------------- | ----------------: |
| Training Set   | `October 21, 2025` to `September 20, 2026`   |            58,979 |
| Validation Set | `September 21, 2026` to `September 27, 2026` |             1,336 |
| Test Set       | `September 28, 2026` to `October 4, 2026`    |             1,328 |

- **Training:** used to fit the model.
- **Validation:** used to compare and select models.
- **Dedicated test:** September 28–October 4; evaluated using the saved model without retraining.

---

<a id="evaluation"></a>

## 📊 Evaluation

Errors are measured in **occupancy percentage points**: predicting `80%` when actual occupancy is `85%` gives a `5-point` error. For each prediction $i$, $y_i$ is actual occupancy, $\hat{y}_i$ is predicted occupancy, and $n$ is the number of predictions evaluated.

### MAE: Mean Absolute Error

$$
\mathrm{MAE} = \frac{1}{n}\sum_{i=1}^{n}\left|\hat{y}_i-y_i\right|
$$

> Take the absolute error of each prediction, then average those errors.

**Purpose:** measure average error across the evaluated set against our target error.

### RMSE: Root Mean Squared Error

$$
\mathrm{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^{n}\left(\hat{y}_i-y_i\right)^2}
$$

> Square each error, average the squared errors, then take the square root. Squaring makes larger mistakes contribute disproportionately; the square root returns the result to occupancy percentage points.

**Purpose:** highlight larger mistakes that MAE alone can hide. Giving larger errors more weight helps with understanding whether the model often makes predictions that are far from actual occupancy, even when its average error is low.

### Model Scores

Results for the `September 28, 2026` to `October 4, 2026` test set, using the `flint_v0.1` model.

- **All hours:** all valid recorded slots (1,328 predictions).
- **Daytime:** 07:00–21:30 Pacific, inclusive (832 predictions).

**Totals across all garages**

| Window    |   MAE |  RMSE |
| --------- | ----: | ----: |
| All hours | 4.165 | 6.034 |
| Daytime   | 3.977 | 6.351 |

**Results by garage**

| Garage       | All-hours MAE | All-hours RMSE | Daytime MAE | Daytime RMSE |
| ------------ | ------------: | -------------: | ----------: | -----------: |
| North        |         4.807 |          5.711 |       3.331 |        4.243 |
| South        |         5.030 |          5.681 |       4.229 |        5.165 |
| South Campus |         3.921 |          8.205 |       5.469 |       10.110 |
| West         |         2.904 |          3.664 |       2.878 |        3.800 |

**General Finding:** Flint meets the 5 point average-error target overall on this test week. West had the lowest daytime error; South Campus exceeded five points and had the largest RMSE. Test and validation records are both in [evaluation.json](evaluation.json).

### Supporting experiments

These tests use **separately trained models with Flint's features and parameters** to explore its behavior. They DO NOT audit the saved model.

#### Does learning a semester's occupancy pattern help predict the rest of that semester?

- **Model A:** trained on fall, spring, and summer observations from `October 21, 2025` to `September 20, 2026` (a 335-day window), excluding winter and breaks.
- **Model B:** trained on the same data, plus winter observations from `December 22, 2025` to `January 3, 2026` (13 days, just under two weeks).
- **Evaluation:** both predicted the remaining winter period, from `January 4, 2026` to `January 16, 2026` (13 days).

| Training data               | Examples | All-hours MAE | Daytime MAE | Daytime RMSE |
| --------------------------- | -------: | ------------: | ----------: | -----------: |
| Fall + spring + summer      |   49,736 |        14.704 |      19.616 |       25.621 |
| Same + first half of winter |   52,196 |     **4.350** |   **5.594** |    **8.782** |

**Finding:** winter examples greatly reduced overprediction, but daytime MAE still exceeded five points. Other semesters did not replace winter-specific data in this test.

**Limit:** spring and summer came after winter, making this a retrospective comparison rather than a forecasting backtest. It doesn't isolate the calendar feature or establish next-winter accuracy. [Full report](supporting_experiments/winter_half_holdout/README.md).

---

<a id="notes"></a>

## 📝 Notes

- **Promising fall results:** daytime MAE was **3.98** on validation and **3.98** on the dedicated test, meeting the five-point target on both weeks.
- **Garage differences matter:** test daytime MAE ranged from **2.88 at West** to **5.47 at South Campus**. South Campus also had the largest daytime RMSE (**10.11**), highlighting larger mistakes.
- **Weekends need attention:** validation daytime MAE was **5.13 on weekends**, compared with **3.52 on weekdays**.
- **Semester context helps in the supporting comparison:** adding the first half of winter reduced daytime MAE from **19.62 to 5.59** for separately trained models. This supports including same-semester examples, but is not a result for the saved artifact.

**Coverage:** the saved model has been evaluated on two adjacent fall weeks. Its performance during winter, summer, semester starts, future years, and daily forecast updates remains unverified. See [saved-model results](evaluation.json) and the [supporting comparison](supporting_experiments/winter_half_holdout/README.md).

---

<a id="model-files"></a>

## 📦 Model Files

| File                               | Contents                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `model.joblib`                     | Selected fitted model                                                                    |
| `README.md`                        | Model overview, results, and observations                                                |
| `icon.svg`                         | README icon                                                                              |
| [metadata.json](metadata.json)     | Features, parameters, data dates, preparation counts, source run, and model SHA-256      |
| [evaluation.json](evaluation.json) | Training scores, validation scores, and verified breakdown by garage and weekday/weekend |
| `supporting_experiments/`          | Reports, results, and comparison records from separate models testing the recipe         |

[Back to top](#contents)
