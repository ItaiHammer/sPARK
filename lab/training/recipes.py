import json
import re
from pathlib import Path


EXPERIMENTS = Path(__file__).resolve().parents[1] / "experiments"


def validate_experiment_name(experiment: str):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", experiment):
        raise ValueError("Experiment names must start with a letter or number and can contain dots, hyphens, and underscores.")


def load_recipe(experiment: str) -> dict:
    """Read an experiment's features and model settings, including inherited inputs."""
    validate_experiment_name(experiment)
    path = EXPERIMENTS / experiment / "metadata.json"
    if not path.is_file():
        raise ValueError(f"Unknown training recipe: {experiment}")
    spec = json.loads(path.read_text(encoding="utf-8"))
    if "parent" in spec:
        parent = load_recipe(spec["parent"])
        spec["features"] = spec.get("features", parent["features"]) + spec.get("additional_features", [])
        spec["model_parameters"] = parent["model_parameters"] | spec.get("model_parameters", {})
    return spec
