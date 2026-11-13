"""BLS Public Data API, version 1 (no key).

Used for every CPI series, because FRED doesn't carry some of the item indexes
the charts need (college tuition, TVs, software). Version 1 limits: 25 series
and 10 years per request, 25 requests per day. 1985 to today is 5 requests.
The API sometimes answers 503 (unavailable) for a while; each request is
retried twice, 30 seconds apart, before giving up.

Responses are cached for the day in data/raw/bls/, so rerunning the pipeline
the same day (say, after a code fix) doesn't spend the daily quota again.
"""
import datetime
import hashlib
import json
import time
import urllib.error

from pathlib import Path

from .common import get_json

API = "https://api.bls.gov/publicAPI/v1/timeseries/data/"
RETRIES, WAIT = 2, 30
CACHE = Path(__file__).resolve().parents[2] / "data" / "raw" / "bls"


def _post(body):
    # Cache key: the request itself plus today's date.
    name = f"{datetime.date.today().isoformat()}-{hashlib.sha256(body).hexdigest()[:12]}.json"
    cached = CACHE / name
    if cached.exists():
        return json.loads(cached.read_text())
    resp = _request(body)
    if resp["status"] == "REQUEST_SUCCEEDED":
        CACHE.mkdir(parents=True, exist_ok=True)
        cached.write_text(json.dumps(resp))
    return resp


def _request(body):
    for attempt in range(RETRIES + 1):
        try:
            return get_json(API, data=body, headers={"Content-Type": "application/json"})
        except urllib.error.HTTPError as e:
            if e.code != 503 or attempt == RETRIES:
                raise
            print(f"BLS answered 503; retrying in {WAIT}s")
            time.sleep(WAIT)


def fetch(series_ids, start_year=2000):
    """{id: [(date "YYYY-MM-01", float)]}, oldest first. Monthly periods only
    (M01..M12); M13, the annual average some series include, is skipped."""
    if len(series_ids) > 25:
        raise ValueError("BLS v1 takes at most 25 series per request")
    out = {sid: [] for sid in series_ids}
    this_year = datetime.date.today().year
    for y0 in range(start_year, this_year + 1, 10):
        body = json.dumps({"seriesid": series_ids, "startyear": str(y0),
                           "endyear": str(min(y0 + 9, this_year))}).encode()
        resp = _post(body)
        if resp["status"] != "REQUEST_SUCCEEDED":
            raise RuntimeError(f"BLS: {resp['status']} {resp.get('message')}")
        for s in resp["Results"]["series"]:
            for o in s["data"]:
                if o["period"].startswith("M") and o["period"] != "M13" and o["value"] != "-":
                    out[s["seriesID"]].append((f"{o['year']}-{o['period'][1:]}-01", float(o["value"])))
    return {sid: sorted(obs) for sid, obs in out.items()}


def page(sid):
    return f"https://data.bls.gov/timeseries/{sid}"
