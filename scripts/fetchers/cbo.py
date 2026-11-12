"""CBO baseline projection of debt held by the public, % of GDP.

cbo.gov blocks scripted downloads (a bot check answers 403), so this reads the
workbook Jack downloads by hand into data/raw/cbo/: the "10-Year Budget
Projections" data file from The Budget and Economic Outlook (currently
51118-2026-02-Budget-Projections.xlsx, February 2026). Without it, the pipeline
still runs and Chart 3a shows history only.

Table 1-1 (CBO's Baseline Budget Projections) has a dollars block, then an
"As a percentage of GDP" block; the "Debt held by the public" row in the
second block is the one used. Its first year is an actual, the rest projections.
"""
import datetime
import re

import openpyxl

from .common import RAW_DIR

CBO_DIR = RAW_DIR / "cbo"
SHEET = "Table 1-1"
PAGE = "https://www.cbo.gov/data/budget-economic-data"


def find_workbook():
    files = sorted(CBO_DIR.glob("*Budget-Projections*.xlsx")) if CBO_DIR.exists() else []
    return files[-1] if files else None


def fetch():
    """{"vintage", "file", "points": [[fiscal year, % of GDP]]} (projected years only),
    or None if there's no workbook yet."""
    path = find_workbook()
    if path is None:
        return None
    # CBO names files <id>-<year>-<month>-...; the month is the baseline's vintage.
    m = re.match(r"\d+-(\d{4})-(\d{2})-", path.name)
    vintage = datetime.date(int(m[1]), int(m[2]), 1).strftime("%B %Y") if m else path.name

    ws = openpyxl.load_workbook(path, read_only=True, data_only=True)[SHEET]
    rows = [r for r in ws.iter_rows(values_only=True)]
    # The year header is the row whose cells after the label are 4-digit years.
    header = next(r for r in rows if str(r[1]).strip().isdigit() and len(str(r[1]).strip()) == 4)
    years = [(i, int(str(c).strip())) for i, c in enumerate(header)
             if c is not None and str(c).strip().isdigit()]
    pct_block = next(i for i, r in enumerate(rows) if any(c and "percentage of GDP" in str(c) for c in r))
    debt = next(r for r in rows[pct_block:] if str(r[0] or "").strip() == "Debt held by the public")

    # The first column is an actual ("Actual, 2025"); history comes from OMB, so keep projections only.
    points = [[y, round(float(debt[i]), 1)] for i, y in years[1:]]
    return {"vintage": vintage, "file": path.name, "actual_year": years[0][1],
            "actual": round(float(debt[years[0][0]]), 1), "points": points}
