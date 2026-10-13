from sklearn.metrics import mean_absolute_error, root_mean_squared_error


def score_predictions(actual, predicted) -> dict:
    return {
        "mae_pp": float(mean_absolute_error(actual, predicted)),
        "rmse_pp": float(root_mean_squared_error(actual, predicted)),
    }
