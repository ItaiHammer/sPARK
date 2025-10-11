from datetime import datetime, timezone
from bs4 import BeautifulSoup
import requests, re

URL = "https://sjsuparkingstatus.sjsu.edu"

LOTS = [
    {"id": "sjsu-south-garage",        "name": "South Garage",        "address": "377 S. 7th St., San Jose, CA 95112"},
    {"id": "sjsu-west-garage",         "name": "West Garage",         "address": "350 S. 4th St., San Jose, CA 95112"},
    {"id": "sjsu-north-garage",        "name": "North Garage",        "address": "65 S. 10th St., San Jose, CA 95112"},
    {"id": "sjsu-south-campus-garage", "name": "South Campus Garage", "address": "1278 S. 10th Street, San Jose, CA 95112"},
]

def metadata():
    return {
        "location_id": "sjsu",
        "location_name": "San Jose State University Parking",
        "timezone": "America/Los_Angeles",
        "lots": LOTS,
        "source_url": URL,
    }

def _parse_pct(text: str) -> int | None:
    """
    accepts '84%', '100% Full', '53 %', 'Full', 'Open', 'N/A', etc.
    returns an int 0–100, or None when no numeric signal.
    """
    if not text:
        return None
    t = text.strip().lower()

    # word-only signals
    if t == "full":
        return 100
    if t in {"open", "n/a", "na", "-", "—"}:
        return None

    # numeric anywhere in the string (e.g., '100% Full', '53 %')
    m = re.search(r"(\d+)", t)
    if m:
        try:
            return max(0, min(100, int(m.group(1))))
        except ValueError:
            return None
    return None


def scrape():
    resp = requests.get(URL, headers={"User-Agent": "sPARKs-Bot"}, timeout=20, verify=False)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    spans = soup.find_all("span", class_="garage__fullness")
    if not spans:
        spans = soup.select(".garage__fullness, [data-garage-fullness]")

    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    rows = []
    for span, lot in zip(spans, LOTS):
        pct = _parse_pct(span.get_text(strip=True))
        rows.append({
            "lot_id": lot["id"],
            "observed_at": now.isoformat(),
            "occupancy_pct": pct, # none if it failed
        })
    return rows
