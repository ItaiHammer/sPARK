<p align="center" style="font-size: 60px;">
  🧪
</p>

<h1 align="center">sPARK Lab</h1>

<p align="center">
  <strong>A place to build, test, and understand parking forecasts.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-3776AB" alt="Python 3.13">
  <img src="https://img.shields.io/badge/scikit--learn-F7931E" alt="scikit-learn">
  <img src="https://img.shields.io/badge/data-Supabase-3ECF8E" alt="Supabase data">
  <img src="https://img.shields.io/badge/status-experimental-blueviolet" alt="Experimental">
</p>

---

## Table of Contents

- [📖 About](#about)
- [📂 Structure](#structure)
- [📚 Getting Started](#getting-started)
- [⚙️ Running Experiments](#running-experiments)
- [📊 Models and Results](#models-and-results)
- [🧪 Tests](#tests)

---

<a id="about"></a>

## 📖 About

sPARK Lab is the Python workspace for experimenting with **parking occupancy forecasts** for SJSU's garages. It loads historical observations from Supabase, prepares features, trains models, and saves their results for comparison.

Models predict **occupancy from 0–100%** for a garage at a given date and time. The goal is to support forecasts up to a week ahead, with an ideal average error of **three percentage points** and **five acceptable**.

Training currently runs locally on CPU. Application export and integration are still planned; `training/export.py` is a placeholder.

---

<a id="structure"></a>

## 📂 Structure

```text
lab/
├── training/              Shared training code
│   ├── train.py           Training entry point
│   ├── data/              Database loading and data preparation
│   ├── features/          Time, holiday, and academic features
│   ├── algorithms/        Model implementations and settings
│   ├── evaluation/        Error metrics and run reports
│   └── tests/             Tests grouped by the same categories
├── local_experiments/     Private training runs and results
├── experiments/           Unfinished models and their documentation
├── models/                Official model releases (currently empty)
├── requirements.txt       Python dependencies
└── README.md
```

### Training files

| File                                            | Purpose                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| [data/loader.py](training/data/loader.py) | Load occupancy observations from Supabase. |
| [data/preparation.py](training/data/preparation.py) | Clean observations and prepare features (`X`) and labels (`y`). |
| [features/builder.py](training/features/builder.py) | Combine the selected features into a feature table. |
| [features/time.py](training/features/time.py) | Calculate weekday and minute of day. |
| [features/holidays.py](training/features/holidays.py) | Check observed U.S. federal holidays. |
| [features/academic.py](training/features/academic.py) | Load term dates and calculate academic features. |
| [algorithms/hgb.py](training/algorithms/hgb.py) | Configure and fit the Histogram Gradient Boosting model.               |
| [train.py](training/train.py)                   | Run training, validation, and an average-based baseline; save the run. |
| [evaluation/metrics.py](training/evaluation/metrics.py) | Calculate MAE and RMSE. |
| [evaluation/report.py](training/evaluation/report.py) | Generate a README for each run. |
| [export.py](training/export.py)                 | Placeholder for exporting models to the application.                   |

**Local files:** credentials, the contents of `local_experiments/`, and `plan.md` are ignored by Git. The folder placeholder is retained. Unfinished models in `experiments/` can be reviewed in the repository. Data comes from the database; there is no separate data folder.

**Workflow:** `train.py` calls data loading and preparation, which builds features; it then fits the algorithm, calculates metrics, and saves the run and report. Small `__init__.py` files make these folders importable Python packages.

---

<a id="getting-started"></a>

## 📚 Getting Started

From `lab/`, using **Python 3.13 and PowerShell**:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Create a local `.env.lab` file:

```dotenv
SUPABASE_URL=your-project-url
SUPABASE_KEY=your-lab-key
```

The key needs read access to `lot_occupancy` and `academic_terms`.

---

<a id="running-experiments"></a>

## ⚙️ Running Experiments

```powershell
python -m training.train --experiment my-experiment --start 2025-10-21 --split 2026-09-21 --end 2026-09-28
```

Dates use **`YYYY-MM-DD` in Pacific time**:

| Flag           | Meaning                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `--experiment` | Experiment folder name; repeated runs get separate timestamped folders. |
| `--start`      | First training day.                                                     |
| `--split`      | First validation day; training ends before this date.                   |
| `--end`        | Validation ends before this date.                                       |

Each run saves **the fitted model, predictions, scores, settings, and a README** under `local_experiments/<name>/runs/`.

- **Model settings:** edit [hgb.py](training/algorithms/hgb.py).
- **Feature selection:** edit `DEFAULT_FEATURES` in [preparation.py](training/data/preparation.py).
- **Current defaults:** use Flint's seven features. `days_since_instruction_start` remains available for experiments but is excluded from the default selection.

---

<a id="models-and-results"></a>

## 📊 Models and Results

The current prototype is **[flint_v0.1](experiments/flint_v0.1/README.md)**. Its folder contains the saved model, training configuration, evaluation results, and supporting comparisons. `models/` is reserved for official releases after evaluation is complete.

| Metric   | Meaning                                                |
| -------- | ------------------------------------------------------ |
| **MAE**  | Average absolute error in occupancy percentage points. |
| **RMSE** | Error measure that gives larger mistakes more weight.  |

Predicting **80%** when actual occupancy is **85%** gives a **five-point error**. Scores cover all hours and **07:00–21:30 Pacific**; only valid observed slots are evaluated.

Use **validation** to compare settings and **a separate test period** to evaluate the selected model. Evaluate several chronological periods, including semester transitions, before drawing conclusions about year-round accuracy. In current run output, `test_rows` counts validation examples.

---

<a id="tests"></a>

## 🧪 Tests

From `lab/` with the virtual environment active:

```powershell
python -m pytest
```

These offline tests check the training code. Forecast accuracy is measured separately through experiments and model evaluations.

[Back to top](#table-of-contents)
