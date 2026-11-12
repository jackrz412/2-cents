"""World Bank Indicators API (no key). Countries only: the API also returns
regional and income-group aggregates ("World", "High income"), dropped here."""
from .common import get_json

API = "https://api.worldbank.org/v2"


def countries():
    """{iso3: name} for real countries (aggregates have region id "NA")."""
    rows = get_json(f"{API}/country?format=json&per_page=400")[1]
    return {c["id"]: c["name"] for c in rows if c["region"]["id"] != "NA"}


def fetch(indicator, since=2000):
    """{iso3: {year: value}} for every country with data since `since`."""
    rows = get_json(f"{API}/country/all/indicator/{indicator}"
                    f"?format=json&per_page=20000&date={since}:2100")[1]
    out = {}
    for r in rows:
        if r["value"] is not None and r["countryiso3code"]:
            out.setdefault(r["countryiso3code"], {})[int(r["date"])] = r["value"]
    return out


def page(indicator):
    return f"https://data.worldbank.org/indicator/{indicator}"
