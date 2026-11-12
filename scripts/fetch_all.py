"""Fetch every dataset and write data/*.json, data/sources.json and data/facts.json.

    .venv/bin/python scripts/fetch_all.py           # reuse raw downloads already in data/raw/
    .venv/bin/python scripts/fetch_all.py --fresh   # re-download them too

API data (FRED, BLS, World Bank, OECD) is always fetched fresh; --fresh only
affects the large files cached in data/raw/ (ACS, OMB). Prints one line per
dataset (rows, date range) to sanity-check.
"""
import argparse
import datetime
import json
import statistics

from fetchers import bls, cbo, census_acs, fred, oecd, omb, worldbank
from fetchers.common import ROOT, read_env, source, write_json

# Charts 1a and 1b have two views, indexed to each base year (LEARNING.md
# decision 2.11). The first is the default view and the one the prose's
# facts use; facts for the others get their own keys (cpi_pct_since_1985).
BASE_YEARS = (2000, 1985)
FIRST_YEAR = min(BASE_YEARS)

# Chart 1a lines: seasonally adjusted (SA) CPI, so monthly lines aren't jagged.
CPI_LINES = {
    "cpi": ("CUSR0000SA0", "All items (overall CPI)"),
    "shelter": ("CUSR0000SAH1", "Shelter"),
    "rent": ("CUSR0000SEHA", "Rent of primary residence"),
    "medical": ("CUSR0000SAM", "Medical care"),
    "tuition": ("CUSR0000SEEB01", "College tuition and fees"),
}
# Chart 1b bars: not seasonally adjusted (NSA), which BLS recommends for
# long-run comparisons, and the only version some items (TVs, software) have.
# Each bar compares the 2000 average with the latest 12 months, so seasonal
# patterns cancel out.
CPI_BARS = {
    "cpi": ("CUUR0000SA0", "All items"),
    "shelter": ("CUUR0000SAH1", "Shelter"),
    "rent": ("CUUR0000SEHA", "Rent"),
    "medical": ("CUUR0000SAM", "Medical care"),
    "hospital": ("CUUR0000SEMD", "Hospital services"),
    "tuition": ("CUUR0000SEEB01", "College tuition and fees"),
    "childcare": ("CUUR0000SEEB03", "Day care and preschool"),
    "food": ("CUUR0000SAF1", "Food"),
    "energy": ("CUUR0000SA0E", "Energy"),
    "vehicles": ("CUUR0000SETA01", "New vehicles"),
    "apparel": ("CUUR0000SAA", "Apparel"),
    "tv": ("CUUR0000SERA01", "Televisions"),
    "computers": ("CUUR0000SEEE01", "Computers and peripherals"),
    "software": ("CUUR0000SEEE02", "Computer software"),
    "toys": ("CUUR0000SERE01", "Toys"),
    "phones": ("CUUR0000SEEE04", "Phones and calculators"),
}
WAGES = "LES1252881500Q"  # median usual weekly earnings, full-time wage and salary workers, nominal
WEALTH = {  # Fed Distributional Financial Accounts, mirrored on FRED
    "top1": "WFRBST01134",
    "next9": "WFRBSN09161",
    "next40": "WFRBSN40188",
    "bottom50": "WFRBSB50215",
}
FOREIGN, DEBT_TOTAL, YIELD_10Y = "FDHBFIN", "FYGFDPUN", "GS10"
GDP_PPP, POVERTY, POPULATION = "NY.GDP.PCAP.PP.KD", "SI.POV.DDAY", "SP.POP.TOTL"
# OECD's 38 member countries (membership, not data); the OECD feed also covers some partners.
OECD_MEMBERS = set(
    "AUS AUT BEL CAN CHL COL CRI CZE DNK EST FIN FRA DEU GRC HUN ISL IRL ISR ITA JPN KOR LVA LTU "
    "LUX MEX NLD NZL NOR POL PRT SVK SVN ESP SWE CHE TUR GBR USA".split()
)

SUMMARY = []


def summarize(name, rows, first, last):
    SUMMARY.append(f"{name:22} {rows:>6} rows  {first} .. {last}")


def month_name(date):  # "2026-10-01" -> "October 2026"
    return datetime.date.fromisoformat(date).strftime("%B %Y")


def quarter_name(date):  # "2026-07-01" -> "Q3 2026"
    d = datetime.date.fromisoformat(date)
    return f"Q{(d.month - 1) // 3 + 1} {d.year}"


def in_year(obs, year):
    return [v for d, v in obs if d.startswith(str(year))]


def base_mean(obs, year):
    return statistics.mean(in_year(obs, year))


def pct_since_base(obs, year, n_latest):
    """% change from the base-year average to the average of the last n_latest
    observations (12 months, or 4 quarters)."""
    latest = statistics.mean(v for _, v in obs[-n_latest:])
    return round((latest / base_mean(obs, year) - 1) * 100, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fresh", action="store_true", help="re-download raw files in data/raw/")
    args = ap.parse_args()

    key = read_env().get("FRED_API_KEY")
    if not key:
        raise SystemExit("FRED_API_KEY missing: add it to .env (see .env.example)")

    today = datetime.date.today()
    facts = {"refresh_date": today.strftime("%B %-d, %Y")}
    sources = []

    # --- Section 1: prices and wages ------------------------------------------
    cpi_ids = sorted({sid for sid, _ in CPI_LINES.values()} | {sid for sid, _ in CPI_BARS.values()})
    cpi = bls.fetch(cpi_ids, start_year=FIRST_YEAR)
    wages = fred.fetch([WAGES], key, start=f"{FIRST_YEAR}-01-01")[WAGES]["obs"]
    last_month = cpi["CUUR0000SA0"][-1][0]

    # A series can be indexed to a base year only if it has the whole year
    # (12 months, or 4 quarters for wages).
    def has_base(obs, year, n):
        return len(in_year(obs, year)) == n

    # Chart 1a: every line must exist in every base year.
    for year in BASE_YEARS:
        for sid, _ in CPI_LINES.values():
            if not has_base(cpi[sid], year, 12):
                raise SystemExit(f"{sid} has {len(in_year(cpi[sid], year))} months in {year}; the index needs all 12")
        if not has_base(wages, year, 4):
            raise SystemExit(f"{WAGES} lacks 4 quarters in {year}")
    # Chart 1b: every bar must exist in the default base year; in earlier
    # base years a bar without data is kept as a "no data" row.
    for sid, _ in CPI_BARS.values():
        if not has_base(cpi[sid], BASE_YEARS[0], 12):
            raise SystemExit(f"{sid} lacks 12 months in {BASE_YEARS[0]}")

    def indexed(obs, year):
        b = base_mean(obs, year)
        return [[d, round(v / b * 100, 1)] for d, v in obs if d >= f"{year}-01-01"]

    index_views, change_views = [], []
    for year in BASE_YEARS:
        lines = [{"key": k, "label": label, "series": sid, "freq": "monthly", "points": indexed(cpi[sid], year)}
                 for k, (sid, label) in CPI_LINES.items()]
        lines.append({"key": "wages", "label": "Median weekly earnings", "series": WAGES, "freq": "quarterly",
                      "points": indexed(wages, year)})
        index_views.append({"base_year": year, "lines": lines})

        bars, missing = [], []
        for k, (sid, label) in CPI_BARS.items():
            if has_base(cpi[sid], year, 12):
                bars.append({"key": k, "label": label, "series": sid, "pct": pct_since_base(cpi[sid], year, 12)})
            else:
                # The month BLS's series starts, shown as "Data from Dec 1997".
                missing.append({"key": k, "label": label, "series": sid, "first": cpi[sid][0][0]})
        bars.sort(key=lambda r: -r["pct"])
        missing.sort(key=lambda r: (r["first"], r["label"]))
        change_views.append({"base_year": year, "items": bars, "missing": missing,
                             "wages": {"pct": pct_since_base(wages, year, 4)}})
        suffix = f"_pct_since_{year}"
        for r in bars:
            facts[f"{r['key']}{suffix}"] = round(r["pct"])
        facts[f"wages{suffix}"] = round(pct_since_base(wages, year, 4))

    write_json("prices_index", {"views": index_views})
    summarize("prices_index", sum(len(l["points"]) for v in index_views for l in v["lines"]),
              f"{FIRST_YEAR}-01-01", last_month)
    write_json("price_changes", {
        "period": f"12 months to {month_name(last_month)}",
        "wages_period": f"4 quarters to {quarter_name(wages[-1][0])}",
        "views": change_views,
    })
    summarize("price_changes", sum(len(v["items"]) for v in change_views),
              "/".join(map(str, BASE_YEARS)), month_name(last_month))

    facts["prices_period"] = f"the 12 months to {month_name(last_month)}"
    facts["wages_period"] = quarter_name(wages[-1][0])

    sources.append(source(
        "bls_cpi", "Consumer Price Index for All Urban Consumers (CPI-U), U.S. city average",
        "U.S. Bureau of Labor Statistics", "https://www.bls.gov/cpi/", month_name(last_month),
        series=sorted(cpi_ids),
        notes="Lines (Chart 1a) use seasonally adjusted series (CUSR...); bars (Chart 1b) use "
              "not seasonally adjusted series (CUUR...), latest 12 months vs. the base-year average "
              "(2000, or 1985 in the longer view)."))
    sources.append(source(
        "fred_wages", "Median usual weekly nominal earnings, full-time wage and salary workers, 16+",
        "U.S. Bureau of Labor Statistics, via FRED", fred.page(WAGES), quarter_name(wages[-1][0]),
        series=[WAGES]))

    # --- Section 1: state map --------------------------------------------------
    value, us_value = census_acs.read("B25077", args.fresh)
    income, us_income = census_acs.read("B19013", args.fresh)
    rent, us_rent = census_acs.read("B25071", args.fresh)
    topo = json.loads((ROOT / "site" / "geo" / "states-10m.json").read_text())
    names = {g["id"]: g["properties"]["name"] for g in topo["objects"]["states"]["geometries"]}
    states = {}
    for fips in sorted(value):
        pti = round(value[fips] / income[fips], 2) if value[fips] and income[fips] else None
        states[fips] = {"price_to_income": pti, "rent_burden": rent.get(fips)}
    us = {"price_to_income": round(us_value / us_income, 2), "rent_burden": us_rent}
    vintage = f"{census_acs.YEAR - 4}–{census_acs.YEAR}"
    write_json("state_affordability", {"acs_vintage": vintage, "us": us, "states": states})
    summarize("state_affordability", len(states), "ACS 5-year", vintage)

    for metric in ("price_to_income", "rent_burden"):
        ranked = sorted((v[metric], f) for f, v in states.items() if v[metric] is not None)
        facts[f"us_{metric}"] = us[metric]
        facts[f"{metric}_highest_state"] = names[ranked[-1][1]]
        facts[f"{metric}_highest"] = ranked[-1][0]
        facts[f"{metric}_lowest_state"] = names[ranked[0][1]]
        facts[f"{metric}_lowest"] = ranked[0][0]
    facts["acs_vintage"] = vintage
    sources.append(source(
        "census_acs", f"American Community Survey 5-year estimates, {vintage}",
        "U.S. Census Bureau", "https://www.census.gov/programs-surveys/acs/data/summary-file.html",
        vintage, series=list(census_acs.TABLES),
        notes="Price-to-income = median owner-occupied home value (B25077) / median household "
              "income (B19013). Rent burden = median gross rent as % of household income (B25071)."))

    # --- Section 2: wealth shares ---------------------------------------------
    w = fred.fetch(list(WEALTH.values()), key)
    by_date = {}
    for group, sid in WEALTH.items():
        for d, v in w[sid]["obs"]:
            by_date.setdefault(d, {"date": d})[group] = round(v, 2)
    rows = [r for _, r in sorted(by_date.items()) if len(r) == len(WEALTH) + 1]
    for r in rows:
        total = sum(r[g] for g in WEALTH)
        if not 99 <= total <= 101:
            raise SystemExit(f"wealth shares on {r['date']} sum to {total:.1f}%, not ~100%")
    write_json("wealth_shares", rows)
    summarize("wealth_shares", len(rows), quarter_name(rows[0]["date"]), quarter_name(rows[-1]["date"]))
    first, last = rows[0], rows[-1]
    facts.update({
        "wealth_period": quarter_name(last["date"]),
        "wealth_first_period": quarter_name(first["date"]),
        "top1_share": round(last["top1"], 1),
        "top10_share": round(last["top1"] + last["next9"], 1),
        "bottom50_share": round(last["bottom50"], 1),
        "top1_share_first": round(first["top1"], 1),
        "bottom50_share_first": round(first["bottom50"], 1),
    })
    sources.append(source(
        "fed_dfa", "Distributional Financial Accounts: share of household net worth by wealth percentile",
        "Federal Reserve Board, via FRED", "https://www.federalreserve.gov/releases/z1/dataviz/dfa/",
        quarter_name(last["date"]), series=list(WEALTH.values())))

    # --- Section 3: debt, interest, defense, foreign holdings ------------------
    f = fred.fetch([FOREIGN, DEBT_TOTAL, YIELD_10Y], key, start="1970-01-01")
    history = omb.debt(args.fresh)
    projection = cbo.fetch()
    debt = {"history": history}
    if projection:
        # CBO's own figure for the last actual year should match OMB's; a big gap
        # would mean the solid and dashed lines don't meet.
        omb_last = dict(history).get(projection["actual_year"])
        if omb_last is None or abs(omb_last - projection["actual"]) > 1:
            raise SystemExit(f"CBO FY{projection['actual_year']} actual {projection['actual']}% vs OMB {omb_last}%")
        debt["projection"] = projection["points"]
        debt["projection_vintage"] = f"CBO baseline, {projection['vintage']}"
    else:
        print("note: no CBO workbook in data/raw/cbo/; debt_gdp.json has history only")
    write_json("debt_gdp", debt)
    summarize("debt_gdp", len(history) + len(debt.get("projection", [])), f"FY{history[0][0]}",
              f"FY{(debt.get('projection') or history)[-1][0]}")
    peak = max(history, key=lambda p: p[1])
    facts.update({"debt_gdp_latest": history[-1][1], "debt_gdp_latest_year": history[-1][0],
                  "debt_gdp_peak": peak[1], "debt_gdp_peak_year": peak[0]})
    sources.append(source(
        "omb_hist_7_1", f"Historical Tables ({omb.VINTAGE} Budget), Table 7.1: Federal Debt at the End of Year",
        "Office of Management and Budget", omb.PAGE, f"FY{history[-1][0]}",
        series=["Debt held by the public, % of GDP"]))
    if projection:
        end = projection["points"][-1]
        facts.update({
            "cbo_debt_gdp_end": end[1], "cbo_debt_gdp_end_year": end[0], "cbo_vintage": projection["vintage"],
            # The first projected year above the historical peak, if any.
            "cbo_passes_peak_year": next((y for y, v in projection["points"] if v > peak[1]), None),
        })
        sources.append(source(
            "cbo_baseline", f"The Budget and Economic Outlook: 10-Year Budget Projections ({projection['vintage']})",
            "Congressional Budget Office", cbo.PAGE, projection["vintage"],
            series=[f"{cbo.SHEET}: Debt held by the public, % of GDP"],
            notes=f"Baseline projection, FY{projection['points'][0][0]}–FY{end[0]}: it assumes "
                  f"current law stays as it is. File: {projection['file']} (downloaded by hand; cbo.gov blocks scripts)."))

    spend = omb.outlays(args.fresh)
    write_json("interest_defense", spend)
    summarize("interest_defense", len(spend), f"FY{spend[0]['year']}", f"FY{spend[-1]['year']}")
    latest = spend[-1]
    # The first year of the current run of years in which net interest exceeded defense.
    since = None
    for r in reversed(spend):
        if r["interest_bn"] <= r["defense_bn"]:
            break
        since = r["year"]
    facts.update({
        "omb_latest_year": latest["year"],
        "net_interest_bn": round(latest["interest_bn"]),
        "defense_bn": round(latest["defense_bn"]),
        "net_interest_pct_gdp": latest["interest_pct_gdp"],
        "defense_pct_gdp": latest["defense_pct_gdp"],
        "interest_above_defense_since": since,
    })
    sources.append(source(
        "omb_hist_3_1", f"Historical Tables ({omb.VINTAGE} Budget), Table 3.1: Outlays by Superfunction and Function",
        "Office of Management and Budget", omb.PAGE, f"FY{latest['year']}",
        series=["National Defense (050)", "Net Interest (900)"],
        notes="Actual outlays only; the table's estimate columns (administration proposals) are excluded."))

    total = dict(f[DEBT_TOTAL]["obs"])  # millions of dollars
    share = [[d, round(v / (total[d] / 1000) * 100, 1)] for d, v in f[FOREIGN]["obs"] if d in total]
    yields = [[d, v] for d, v in f[YIELD_10Y]["obs"] if d >= share[0][0]]
    write_json("foreign_holdings", {"foreign_share": share, "yield_10y": yields})
    summarize("foreign_holdings", len(share) + len(yields), quarter_name(share[0][0]), quarter_name(share[-1][0]))
    peak_share = max(share, key=lambda p: p[1])
    facts.update({
        "foreign_share": share[-1][1], "foreign_share_period": quarter_name(share[-1][0]),
        "foreign_share_peak": peak_share[1], "foreign_share_peak_period": quarter_name(peak_share[0]),
        "yield_10y": yields[-1][1], "yield_10y_period": month_name(yields[-1][0]),
    })
    sources.append(source(
        "fred_foreign", "Federal debt held by foreign and international investors; federal debt held by the public",
        "U.S. Treasury (TIC) and Federal Reserve, via FRED", fred.page(FOREIGN), quarter_name(share[-1][0]),
        series=[FOREIGN, DEBT_TOTAL], notes="Share = foreign holdings / total debt held by the public."))
    sources.append(source(
        "fred_gs10", "10-year Treasury constant maturity rate, monthly average",
        "Federal Reserve Board, via FRED", fred.page(YIELD_10Y), month_name(yields[-1][0]), series=[YIELD_10Y]))

    # --- Section 4: world -------------------------------------------------------
    names_wb = worldbank.countries()
    gdp = {c: v for c, v in worldbank.fetch(GDP_PPP).items() if c in names_wb}
    pov = {c: v for c, v in worldbank.fetch(POVERTY).items() if c in names_wb}
    pop = {c: v for c, v in worldbank.fetch(POPULATION).items() if c in names_wb}
    # Rank everyone in one year: the latest year most countries have reported.
    rank_year = statistics.mode(max(v) for v in gdp.values())
    in_year = sorted(((v[rank_year], c) for c, v in gdp.items() if rank_year in v), reverse=True)
    rank = {c: i + 1 for i, (_, c) in enumerate(in_year)}
    big = [c for _, c in in_year if pop.get(c) and pop[c][max(pop[c])] >= 10_000_000]

    world = {}
    for c in sorted(names_wb):
        row = {"name": names_wb[c]}
        if c in gdp:
            y = max(gdp[c])
            row.update(gdp_pc=round(gdp[c][y]), gdp_year=y, gdp_rank=rank.get(c))
        if c in pov:
            y = max(pov[c])
            row.update(poverty=pov[c][y], poverty_year=y)
        if c in pop:
            row["population"] = pop[c][max(pop[c])]
        if len(row) > 1:
            world[c] = row
    write_json("world", {"gdp_rank_year": rank_year, "gdp_rank_count": len(in_year),
                         "poverty_line": "$3.00 a day (2021 PPP)", "countries": world})
    summarize("world", len(world), "GDP pc rank year", rank_year)
    usa = world["USA"]
    facts.update({
        "us_gdp_pc": f"{usa['gdp_pc']:,}", "us_gdp_pc_year": usa["gdp_year"],
        "us_gdp_rank": rank["USA"], "gdp_rank_count": len(in_year), "gdp_rank_year": rank_year,
        "us_gdp_rank_pop10m": big.index("USA") + 1, "pop10m_count": len(big),
        "us_poverty_3usd": usa["poverty"], "us_poverty_year": usa["poverty_year"],
        "poverty_line": "$3.00 a day (2021 PPP)",
    })
    sources.append(source(
        "wb_gdp_ppp", "GDP per capita, PPP (constant 2021 international $)", "World Bank, World Development Indicators",
        worldbank.page(GDP_PPP), str(max(max(v) for v in gdp.values())), series=[GDP_PPP],
        notes=f"Ranks use {rank_year}, the latest year most countries report. Population ({POPULATION}) "
              "is used only to rank among countries of 10 million people or more."))
    sources.append(source(
        "wb_poverty", "Poverty headcount ratio at $3.00 a day (2021 PPP), % of population",
        "World Bank, Poverty and Inequality Platform", worldbank.page(POVERTY),
        "latest survey year per country", series=[POVERTY],
        notes="The international poverty line was revised in 2025 from $2.15 (2017 PPP) to $3.00 (2021 PPP)."))

    rel = {c: r for c, r in oecd.fetch().items() if c in OECD_MEMBERS}
    rows = sorted(({"iso3": c, **r} for c, r in rel.items()), key=lambda r: -r["rate"])
    for r in rows:
        r["rate"] = round(r["rate"], 1)
    write_json("relative_poverty", rows)
    years = [r["year"] for r in rows]
    summarize("relative_poverty", len(rows), min(years), max(years))
    us_rel = next(r for r in rows if r["iso3"] == "USA")
    facts.update({
        "us_relative_poverty": us_rel["rate"], "us_relative_poverty_year": us_rel["year"],
        "us_relative_poverty_rank": rows.index(us_rel) + 1, "oecd_count": len(rows),
        "oecd_median_relative_poverty": round(statistics.median(r["rate"] for r in rows), 1),
    })
    sources.append(source(
        "oecd_idd", "Income Distribution Database: poverty rate after taxes and transfers (50% of median)",
        "OECD", oecd.PAGE, f"{min(years)}–{max(years)} (latest per country)",
        notes="OECD member countries with data (Colombia has none in this database); each country's latest year."))

    # --- Manifest and facts ------------------------------------------------------
    for s in sources:
        s["retrieved"] = today.isoformat()
    write_json("sources", sources, pretty=True)
    write_json("facts", facts, pretty=True)

    print("\n".join(SUMMARY))
    print(f"wrote {len(SUMMARY)} datasets, sources.json ({len(sources)} sources), facts.json ({len(facts)} facts)")


if __name__ == "__main__":
    main()
