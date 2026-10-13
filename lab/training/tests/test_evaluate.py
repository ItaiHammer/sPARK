import pytest

from training.evaluate import score_predictions


def test_error_is_measured_in_occupancy_percentage_points():
    metrics = score_predictions([85, 20], [80, 22])
    assert metrics["mae_pp"] == 3.5
    assert metrics["rmse_pp"] == pytest.approx((29 / 2) ** 0.5)
