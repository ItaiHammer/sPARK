import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor


def fit_model(X: pd.DataFrame, y: pd.Series) -> HistGradientBoostingRegressor:
    X = X.copy()
    for column in ("lot_id", "calendar"):
        if column in X.columns:
            X[column] = X[column].astype("category")

    model = HistGradientBoostingRegressor(
        categorical_features="from_dtype",
        max_iter=1000,
        max_leaf_nodes=60,
        min_samples_leaf=50,
        l2_regularization=0.0,
        learning_rate=0.01,
        early_stopping=False,
        random_state=42,
    )

    model.fit(X, y)
    return model
