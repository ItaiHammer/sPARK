"""Bundle the published lab checkpoint and its shared Python code for Vercel."""

from pathlib import Path
from shutil import copy2, copytree, ignore_patterns, rmtree
import subprocess
import sys
import sysconfig
import tomllib


app = Path(__file__).resolve().parent
source_lab = app.parents[1] / "lab"
if not (source_lab / "models/flint_v0.3/model.joblib").is_file():
    raise SystemExit("Flint requires the repo's lab directory. Enable source files outside the Vercel Root Directory.")

bundle = app / "lab"
copytree(source_lab / "training", bundle / "training", dirs_exist_ok=True,
         ignore=ignore_patterns("__pycache__", "tests"))
copy2(source_lab / "__init__.py", bundle)
model = bundle / "models/flint_v0.3"
model.mkdir(parents=True, exist_ok=True)
for name in ("model.joblib", "metadata.json"):
    copy2(source_lab / "models/flint_v0.3" / name, model)

if "--install" in sys.argv:
    site_packages = Path(sysconfig.get_path("purelib")).resolve()
    if not site_packages.is_relative_to(Path(sys.prefix).resolve()) or sys.prefix == sys.base_prefix:
        raise SystemExit("Install Flint only in a dedicated virtual environment.")
    dependencies = tomllib.loads((app / "pyproject.toml").read_text(encoding="utf-8"))["project"]["dependencies"]
    subprocess.run([sys.executable, "-m", "pip", "install", "--no-compile", *dependencies], check=True)

    # The upstream wheels include test suites that inference does not import.
    for name in ("numpy", "pandas", "scipy", "sklearn", "joblib", "narwhals"):
        for directory in sorted((site_packages / name).rglob("tests"), reverse=True):
            if directory.is_dir():
                rmtree(directory)
