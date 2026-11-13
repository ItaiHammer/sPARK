import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from ..recipes import load_recipe


def fit_model(
    X: pd.DataFrame, y: pd.Series, *, parameters: dict | None = None
) -> HistGradientBoostingRegressor:
    X = X.copy()
    for column in ("lot_id", "calendar"):
        if column in X.columns:
            X[column] = X[column].astype("category")
    for column in X.select_dtypes(include="category").columns:
        X[column] = X[column].cat.remove_unused_categories()

    if parameters is None:
        parameters = load_recipe("flint_v0.1")["model_parameters"]
    return HistGradientBoostingRegressor(**parameters).fit(X, y)
