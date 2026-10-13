import json
from datetime import datetime, timezone
from unittest.mock import Mock

import numpy as np
import pandas as pd
import pytest

from training import train
from training.dataset import TrainingData


def test_named_experiment_creates_separate_runs_without_overwriting(tmp_path, monkeypatch):
    monkeypatch.setattr(train, "__file__", str(tmp_path / "lab" / "training" / "train.py"))
    X = pd.DataFrame({"lot_id": ["north", "north"], "weekday": [0, 1], "minute_of_day": [600, 600]})
    targets = pd.DataFrame({
        "lot_id": ["north", "north"],
        "target_time": pd.to_datetime(["2026-09-21T17:00:00Z", "2026-09-22T17:00:00Z"], utc=True),
    })
    data = TrainingData(X=X, y=pd.Series([80, 85]), targets=targets, summary={})
    monkeypatch.setattr(train, "load_occupancy", lambda start, end: None)
    monkeypatch.setattr(train, "prepare_training_data", lambda rows: data)
    model = Mock()
    model.predict.return_value = np.array([82.0])
    model.get_params.return_value = {"max_leaf_nodes": 15}
    monkeypatch.setattr(train, "fit_model", lambda X, y: model)
    monkeypatch.setattr(train.joblib, "dump", lambda model, path: path.write_bytes(b"test-model"))
    dates = [datetime(2026, 9, day, tzinfo=timezone.utc) for day in (21, 22, 23)]

    first = train.run_experiment(*dates, experiment="flint_v0.1")
    original_metrics = (first / "metrics.json").read_bytes()
    second = train.run_experiment(*dates, experiment="flint_v0.1")

    assert first != second
    assert first.parent == second.parent == tmp_path / "lab" / "local_experiments" / "flint_v0.1" / "runs"
    assert (first / "metrics.json").read_bytes() == original_metrics
    for output in (first, second):
        assert (output / "model.joblib").exists()
        assert (output / "predictions.csv").exists()
        assert json.loads((output / "run.json").read_text())["experiment"] == "flint_v0.1"
        readme = (output / "README.md").read_text(encoding="utf-8")
        assert "Validation results" in readme
        assert "2026-09-22T00:00:00+00:00" in readme
        assert '"max_leaf_nodes": 15' in readme


@pytest.mark.parametrize("name", ["../outside", "nested/name", "", "C:\\outside", ".", ".."])
def test_experiment_name_cannot_escape_experiments_folder(name, monkeypatch):
    load = Mock()
    monkeypatch.setattr(train, "load_occupancy", load)
    dates = [datetime(2026, 9, day, tzinfo=timezone.utc) for day in (21, 22, 23)]
    with pytest.raises(ValueError, match="Experiment names"):
        train.run_experiment(*dates, experiment=name)
    load.assert_not_called()
