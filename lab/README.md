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
- [🔥 Flint](#flint)
- [⚙️ Run It Yourself](#running-experiments)

---

<a id="about"></a>

## 📖 About

I build and test parking occupancy models for SJSU's garages using historical readings from Supabase. I publish the experiments here to show what I tried, how I built each model, and what I learned.

The models predict **0-100% occupancy** for a garage at a given time. My goal is to forecast up to a week ahead with an average error of **3-5 percentage points**. Training runs locally on CPU. App integration is planned.

---

<a id="structure"></a>

## 📂 Structure

```text
lab/
├── training/                 Shared code for training and evaluation
│   ├── train.py               Entry point for training and replay
│   ├── recipes.py             Loads each experiment's inputs and settings
│   ├── data/                  Loads and prepares garage readings
│   │   ├── loader.py           Reads the database or a snapshot
│   │   └── preparation.py      Cleans readings and builds training rows
│   ├── features/              Builds time, calendar, and occupancy inputs
│   │   ├── builder.py          Assembles the feature table
│   │   └── history.py          Calculates comparable-day and last-week values
│   ├── algorithms/            Fits the trees and applies Flint's opening adjustment
│   │   ├── hgb.py              Fits the boosted trees
│   │   └── flint_opening.py    Applies the opening curve and clearing update
│   ├── evaluation/            Replays forecasts and scores them against actual readings
│   │   ├── replay.py           Recreates forecasts on past dates
│   │   └── metrics.py          Calculates forecast errors
│   └── tests/                 Checks the training and forecasting code
├── experiments/              What I tried, how it worked, and what I learned
│   ├── flint_v0.1/            Calendar baseline
│   ├── flint_v0.2/            Tree tuning
│   └── flint_v0.3/            Holidays and opening week
├── models/                   Models packaged for release
│   └── flint_v0.3/            Beta model, metadata, and release notes
├── local_experiments/        Private snapshots and local runs (Git-ignored)
└── requirements.txt          Python dependencies
```

---

<a id="flint"></a>

## 🔥 Flint

Flint is the name I use for the sPARK forecasting models. Here are the three experiments that led to the beta.

| Experiment                                     | What I tried                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Flint v0.1](experiments/flint_v0.1/README.md) | **Calendar baseline.** I started with the garage, time, and academic calendar.                                                                    |
| [Flint v0.2](experiments/flint_v0.2/README.md) | **Tuned trees.** I kept the same inputs and tuned the tree settings to lower average error.                                                       |
| [Flint v0.3](experiments/flint_v0.3/README.md) | **Holidays and opening week.** I added occupancy history and an opening-week adjustment to improve forecasts on holidays and when classes resume. |

**Beta model:** I chose [Flint v0.3](models/flint_v0.3/README.md) for release. That folder has the fitted model, its settings, and the spring opening-week limitation.

---

<a id="running-experiments"></a>

## ⚙️ Run It Yourself

Use Python 3.13 and the private occupancy snapshot to fit Flint or compare its forecasts with historical readings. [Training and replay commands](experiments/flint_v0.3/README.md#reproduce)
