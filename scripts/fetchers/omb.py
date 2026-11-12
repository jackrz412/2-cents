"""OMB Historical Tables (published with the FY2027 Budget, April 2026).

Table 3.1, outlays by superfunction and function: National Defense (function
050) and Net Interest (function 900), fiscal years 1940 on, in millions of
dollars and as % of GDP. One table, so the two lines share a source, units and
fiscal-year timing.

Table 7.1, federal debt at the end of the year: debt held by the public as % of
GDP, fiscal years 1940 on. Used instead of FRED's FYPUGDA188S, which is computed
differently (97.8% for FY2025 against OMB's 99.5% and CBO's 99.4%), so the
history line meets CBO's projection without a jump.

Columns or rows marked "estimate" are the administration's budget proposals,
not actual outlays, and are dropped (the page describes; it doesn't project policy).
"""
import openpyxl

from .common import RAW_DIR, download

VINTAGE = "FY2027"  # the budget year the tables were published with
BASE = "https://www.whitehouse.gov/wp-content/uploads/2026/04"
PAGE = "https://www.whitehouse.gov/omb/information-resources/budget/historical-tables/"


def _rows(table, fresh):
    name = f"{table}_{VINTAGE.lower()}.xlsx"
    path = download(f"{BASE}/{name}", RAW_DIR / "omb" / name, fresh)
    ws = next(iter(openpyxl.load_workbook(path, read_only=True, data_only=True)))
    return [r for r in ws.iter_rows(values_only=True)]


def outlays(fresh=False):
    """Table 3.1: [{"year", "defense_bn", "interest_bn", "defense_pct_gdp", "interest_pct_gdp"}]."""
    rows = _rows("hist03z1", fresh)
    header = rows[1]
    years = [(i, int(h)) for i, h in enumerate(header) if isinstance(h, str) and h.isdigit()]

    # The table repeats row labels in each block ("In millions of dollars",
    # "As percentages of outlays", "As percentages of GDP"), so find each
    # label inside the right block.
    block, found = None, {}
    for r in rows:
        label = (r[0] or "").strip()
        if label.endswith(":"):
            block = label
        key = (block, label.lower())
        if key not in found:
            found[key] = r
    dollars, pct = "In millions of dollars:", "As percentages of GDP:"
    d_def, d_int = found[(dollars, "national defense")], found[(dollars, "net interest")]
    p_def, p_int = found[(pct, "national defense")], found[(pct, "net interest")]

    return [
        {
            "year": y,
            "defense_bn": round(d_def[i] / 1000, 1),
            "interest_bn": round(d_int[i] / 1000, 1),
            "defense_pct_gdp": p_def[i],
            "interest_pct_gdp": p_int[i],
        }
        for i, y in years
    ]


def debt(fresh=False):
    """Table 7.1: [[fiscal year, debt held by the public, % of GDP]], actual years only."""
    rows = _rows("hist07z1", fresh)
    # Header rows 1-3: a "As Percentages of GDP" block, inside it "Equals: Held
    # by the Public", whose first column is the total.
    pct_start = next(i for i, c in enumerate(rows[1]) if c and "Percentages of GDP" in str(c))
    col = next(i for i, c in enumerate(rows[2]) if i >= pct_start and c and "Held by the Public" in str(c))
    out = []
    for r in rows[4:]:
        year = str(r[0] or "").strip()
        # Skips "TQ" (the 1976 transition quarter), "<year> estimate" rows and notes.
        if year.isdigit() and isinstance(r[col], (int, float)):
            out.append([int(year), r[col]])
    return out
