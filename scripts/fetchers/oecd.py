"""OECD Income Distribution Database, through the OECD SDMX API (no key).

Relative poverty rate: share of people with disposable income (after taxes and
transfers) below 50% of their country's median. Whole population, current
income definition (METH2012, D_CUR).
"""
import csv
import io

from .common import get

FLOW = "OECD.WISE.INE,DSD_WISE_IDD@DF_IDD,"
# Dimensions in order: area . freq . measure . operation . unit . age . methodology . definition . poverty line
KEY = ".A.PR_INC_DISP._Z.PT_POP._T.METH2012.D_CUR.PL_50"
URL = f"https://sdmx.oecd.org/public/rest/data/{FLOW}/{KEY}?startPeriod=2010&format=csvfilewithlabels"
# oecd.org refuses scripted requests, so a guessed page link can't be checked;
# sources.json links to the exact data query instead, which anyone can open.
PAGE = URL


def fetch():
    """{iso3: {"name", "year", "rate"}}, each country's latest year."""
    out = {}
    for r in csv.DictReader(io.StringIO(get(URL).decode("utf-8-sig"))):
        if not r["OBS_VALUE"]:
            continue
        area, year = r["REF_AREA"], int(r["TIME_PERIOD"])
        if area not in out or year > out[area]["year"]:
            out[area] = {"name": r["Reference area"], "year": year, "rate": float(r["OBS_VALUE"])}
    return out
