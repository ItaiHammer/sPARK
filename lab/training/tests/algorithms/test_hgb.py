import numpy as np
import pandas as pd

from training.algorithms.hgb import fit_model


def test_model_learns_categories_and_accepts_raw_future_features():
    X = pd.DataFrame({
        "lot_id": ["north"] * 200 + ["south"] * 200,
        "calendar": ["fall"] * 400,
        "minute_of_day": [600] * 400,
        "days_until_term_end": [88, np.nan] * 200,
    })
    y = pd.Series([80] * 200 + [20] * 200)
    original = X.copy(deep=True)

    model = fit_model(X, y)
    future = pd.DataFrame({
        "lot_id": ["south", "north", "unseen-garage"],
        "calendar": ["fall", "fall", "spring"],
        "minute_of_day": [600, 600, 600],
        "days_until_term_end": [np.nan, np.nan, np.nan],
    })
    predictions = model.predict(future)

    assert predictions[0] < 25
    assert predictions[1] > 75
    assert np.isfinite(predictions).all()
    pd.testing.assert_frame_equal(X, original)


def test_numeric_only_feature_selection_can_train():
    X = pd.DataFrame({"minute_of_day": [600] * 200 + [1200] * 200})
    y = pd.Series([80] * 200 + [20] * 200)

    model = fit_model(X, y)
    predictions = model.predict(pd.DataFrame({"minute_of_day": [600, 1200]}))

    assert predictions[0] > 75
    assert predictions[1] < 25
