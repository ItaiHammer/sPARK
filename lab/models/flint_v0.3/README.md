<p align="center">
  <img src="../../experiments/flint_v0.1/icon.svg" alt="Flint rock icon" width="96" height="96">
</p>

<h1 align="center">Flint v0.3 Beta</h1>

<p align="center"><strong>Parking occupancy forecasts for sPARK.</strong></p>

---

Flint predicts **0-100% occupancy** for SJSU garages. The beta packages the nine-input boosted trees fitted on **58,795 readings** through September 19, 2026. The opening curve and clearing update run after the trees predict. [Features and examples](../../experiments/flint_v0.3/README.md#features)

## Spring opening week

In the spring 2026 replay, Flint had no earlier opening week to build a curve from. The trees underpredicted occupancy and missed many near-full warnings. Fall's replay could use the spring opening. [Opening-week timeline](../../experiments/flint_v0.3/README.md#opening-week)

| Spring 2026 | Near-full slots caught |
| ----------- | ---------------------: |
| First day   |             **0 / 34** |
| First week  |           **17 / 154** |

Near-full means **93% occupancy or higher**. Average daytime error in spring week one was **20.0 percentage points**.

## Evaluation

The same-day replay refit Flint weekly and scored **32,135** observed daytime half-hours. Average error was **5.6 percentage points**. On fall day one, Flint caught **33 of 37** near-full slots. The beta ships the September 20 checkpoint. Accuracy on a fresh opening and at multi-day lead times still needs validation. [Replay results](../../experiments/flint_v0.3/README.md#evaluation)

For a forecast issued on Monday for Wednesday, use the school calendar and readings already available on Monday. Wednesday's same-day refresh can use Wednesday morning's readings for clearing. [Forecast timing](../../experiments/flint_v0.3/README.md#forecasts-days-ahead)

## Model files

| File                                                           | Contents                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [model.joblib](model.joblib)                                   | Frozen fitted trees, 7,605,984 bytes                                           |
| [metadata.json](metadata.json)                                 | Input order, parameters, training cutoff, runtime versions, and SHA-256 hashes |
| [flint_opening.py](../../training/algorithms/flint_opening.py) | Opening-week curve and clearing update                                         |

Load `model.joblib` with the [pinned lab environment](../../requirements.txt). Build the nine inputs in the order listed in `metadata.json`, with `lot_id` and `calendar` as categorical columns. The file returns the tree's occupancy prediction.

For the full beta forecast, blend the tree prediction with the opening curve when applicable. The clearing update needs the earlier blended forecasts for the same garage and day plus the readings available before issue time. In the replay, that cutoff is 30 minutes before the target slot. [Training and replay commands](../../experiments/flint_v0.3/README.md#reproduce)
