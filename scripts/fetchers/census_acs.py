"""Census ACS 5-year estimates, by state, from the table-based summary files.

The Census API now redirects keyless requests to missing_key.html, so this reads
the bulk summary files instead (the same files and format the housing map uses):
pipe-delimited, one row per geography, GEO_ID then <TABLE>_E### estimate and
<TABLE>_M### margin-of-error columns. No key needed.
"""
from .common import RAW_DIR, download

YEAR = 2024  # 5-year vintage end year: 2024 = 2020-2024
BASE = f"https://www2.census.gov/programs-surveys/acs/summary_file/{YEAR}/table-based-SF/data/5YRData"
TABLES = {
    "B25077": "Median value (dollars), owner-occupied housing units",
    "B19013": "Median household income in the past 12 months",
    "B25071": "Median gross rent as a percentage of household income",
}
STATE_PREFIX = "0400000US"  # summary level 040 = state
NATION = "0100000US"


def url(table):
    return f"{BASE}/acsdt5y{YEAR}-{table.lower()}.dat"


def read(table, fresh=False):
    """({state_fips: estimate}, national estimate) for the table's first column.
    Census marks unavailable values with large negative codes; those become None."""
    path = download(url(table), RAW_DIR / "acs" / f"acsdt5y{YEAR}-{table.lower()}.dat", fresh)
    col = f"{table}_E001"
    states, nation = {}, None
    with path.open() as f:
        header = f.readline().rstrip("\n").split("|")
        i = header.index(col)
        for line in f:
            parts = line.rstrip("\n").split("|")
            geo = parts[0]
            if not (geo == NATION or geo.startswith(STATE_PREFIX)):
                continue
            v = float(parts[i]) if parts[i] not in ("", None) else None
            v = None if v is None or v < 0 else v
            if geo == NATION:
                nation = v
            else:
                fips = geo[len(STATE_PREFIX):]
                if int(fips) <= 56:  # 50 states + DC; drop Puerto Rico (72), as the housing map does
                    states[fips] = v
    return states, nation
