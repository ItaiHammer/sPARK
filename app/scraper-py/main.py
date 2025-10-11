import os
import sys

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(APP_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.scraper import db

PACKAGE_BASE = "app.scraper.locations"
LOCATIONS_DIR = os.path.join(APP_DIR, "scraper", "locations")

def run_scrapers() -> dict[str, list[dict]]:
    results = {}
    for filename in os.listdir(LOCATIONS_DIR):
        if filename.endswith(".py") and filename != "__init__.py":
            module_name = filename[:-3]
            full_name = f"{PACKAGE_BASE}.{module_name}"

            try:
                module = __import__(full_name, fromlist=[module_name])
            except Exception as e:
                print(f"[import error] {full_name}: {e}")
                continue

            if hasattr(module, "scrape"):
                try:
                    rows = module.scrape()
                    if isinstance(rows, list):
                        results[module_name] = rows
                    else:
                        print(f"[warn] {module_name}.scrape() returned {type(rows)}")
                except Exception as e:
                    print(f"[scrape error] {module_name}: {e}")
            else:
                print(f"[skip] {module_name} has no scrape()")
    return results

def main():
    results = run_scrapers()

    flat_rows = []
    for rows in results.values():
        if isinstance(rows, list):
            flat_rows.extend(rows)

    if not flat_rows:
        print("No rows to insert.")
        return

    try:
        inserted = db.insert_parking_data(flat_rows)
        print(f"Inserted/Upserted {inserted} total rows into lot_occupancy")
    except Exception as e:
        print(f"[db error] bulk insert failed: {e}")

if __name__ == "__main__":
    main()
