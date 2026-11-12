"""FRED (Federal Reserve Bank of St. Louis) API: one request per series.

Needs FRED_API_KEY in .env. The key goes in the request URL, so URLs are never
printed or saved; sources.json links to the public series page instead.
"""
import urllib.parse

from .common import get_json

API = "https://api.stlouisfed.org/fred"


def _call(endpoint, key, **params):
    q = urllib.parse.urlencode({**params, "api_key": key, "file_type": "json"})
    return get_json(f"{API}/{endpoint}?{q}")


def fetch(series_ids, key, start="1900-01-01"):
    """{id: {"title", "units", "frequency", "obs": [(date "YYYY-MM-DD", float)]}}.

    FRED marks missing observations with "."; those are dropped.
    """
    out = {}
    for sid in series_ids:
        meta = _call("series", key, series_id=sid)["seriess"][0]
        obs = _call("series/observations", key, series_id=sid, observation_start=start)["observations"]
        out[sid] = {
            "title": meta["title"],
            "units": meta["units"],
            "frequency": meta["frequency"],
            "obs": [(o["date"], float(o["value"])) for o in obs if o["value"] != "."],
        }
    return out


def page(sid):
    return f"https://fred.stlouisfed.org/series/{sid}"
