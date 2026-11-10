# My Two Cents on the US Economy — Project Spec

**Owner:** Jack Roberts (jackrz412)
**Time budget:** one 8-hour day. Ship a working v1 today; polish later.
**One-liner:** An interactive, data-driven write-up answering "what do you think about the economy?", with the four things I think every American should be watching.

---

## 1. Ground rules for Claude Code

1. **Read this whole spec first**, then inspect `~/Projects/us-housing-map` and reuse its stack, build tooling, D3/TopoJSON patterns, and design tokens (soft-paper off-white background, IBM Plex Serif/Sans/Mono, navy accent). Match the portfolio's editorial/research-report look.
2. **Do not run git commands.** Jack does all version control himself. At the end of each phase, STOP and print:
   - what was built (2–4 bullets)
   - a suggested commit message
   - what Jack should look at in the browser to verify it
3. **Maintain `LEARNING.md`** as you go. Each phase appends:
   - a **Glossary** of new CS/web/data terms used in that phase (plain-English definition plus where it shows up in this repo)
   - a **Decision log** of the choices made, alternatives considered, and why
   Keep entries short and concrete. Jack is a consultant and economist moving into engineering, so explain the *why*, not just the *what*.
4. **Every number on the page must trace to a source.** No hard-coded statistics in prose or charts. All data flows through the pipeline in section 4, and headline numbers used in the prose come from a generated `data/facts.json`.
5. **Verify every data series ID or endpoint before using it.** The IDs below are candidates. If one is wrong, discontinued, or has changed, find the correct one, use it, and note the change in the decision log.
6. **Stay inside the time budget.** If a phase runs long, use the cut list in section 8 and say what you cut.

---

## 2. Framing and tone

- Hook / title: **"My Two Cents"**. The joke is that when people ask an econ grad about the economy, he sends them this link. Use a light, friendly intro and a subtle penny/coin motif (original design, no currency imagery reproductions beyond a generic coin).
- The voice is "here's what I watch and why," **descriptive, not partisan**. Let the charts make the argument. No politicians, parties, or policy prescriptions.
- Each section names the honest counterpoint or caveat a sharp reader would raise. That's a feature, not a hedge.
- Audience: general readers *and* hiring managers for applied-AI / data roles. It should read cleanly and show technical skill.

---

## 3. Page structure and components

Single long-form article page. A sticky, minimal section nav (four dots/labels) shows reading progress.

### Intro
- Title, one-paragraph hook, "last data refresh: <date>" pulled from `data/facts.json`.

### Section 1 — The affordability gap
*Thesis: the problem people feel is a composition problem. Core costs (housing, healthcare, tuition) have outrun wages and overall inflation, while many goods got cheaper.*
- **Chart 1a: indexed price lines** (base year 2000 = 100). Lines: overall CPI, shelter/rent, medical care, college tuition, plus a wage line (median weekly earnings). Hover tooltip shows value and % change since 2000. Toggle chips switch categories on/off.
- **Chart 1b: "what got pricier vs. cheaper" bar chart**, showing % change since 2000 by CPI category (include a few that fell, such as TVs, software/computers, toys), sorted, with a wage reference line.
- **Map 1: state affordability choropleth** (D3 + us-atlas TopoJSON). Default metric: median home value ÷ median household income (price-to-income). Toggle: median gross rent as % of household income. Hover shows the state name, value, and national comparison. Threshold-based color scale, consistent with the housing map's design language.
- Caveat callout: average real wages have risen over long periods. The point is *which* prices rose, and for whom.

### Section 2 — Wealth concentration
*Thesis: income stats understate the gap. Ownership of assets is where concentration shows up.*
- **Chart 2a: stacked area** of the share of total household net worth by group (top 1%, next 9%, next 40%, bottom 50%), 1989–present, from the Fed Distributional Financial Accounts.
- **Chart 2b (small):** asset composition by group (e.g. share of wealth in equities vs. real estate) *if time allows*. It explains why stock rallies widen the gap.
- Caveat callout: wealth ≠ income ≠ consumption; DFA methodology notes.

### Section 3 — The debt and the dollar
*Thesis: the debt matters, but not because the US "can't pay." Debt is issued in dollars. The risks are interest costs crowding out other spending, political/technical default (debt ceiling), inflation pressure, and demand for Treasuries and the dollar's reserve role.*
- **Chart 3a:** federal debt held by the public as % of GDP, historical (solid) + CBO baseline projection (dashed), with annotations for WWII, 2008, and 2020.
- **Chart 3b:** federal net interest vs. national defense spending over time (same units and frequency).
- **Chart 3c (small):** share of Treasury debt held by foreign and international investors, plus the 10-year yield as context.
- Explainer callout: "Can the US default?", with a short, neutral explanation of the debt ceiling vs. ability to pay.

### Section 4 — Still the richest nation on earth
*Thesis: the optimistic closer. The US has enormous resources and opportunity, and its poor are materially better off than the global poor by absolute measures. Then the honest caveat.*
- **Globe (globe.gl, Three.js/WebGL):** a rotatable 3D globe with countries colored by GDP per capita (PPP, constant international $). Drag to spin, scroll to zoom, gentle auto-rotate until the user interacts. Hover/click shows the country, value, and rank. Toggle to: share of population below the World Bank international poverty line. Optional: extruded country polygons by value.
- **Chart 4a (small):** relative poverty rate across rich (OECD) countries, the Angus Deaton–style caveat that the US looks worse on relative measures.
- Closing paragraph: tie the four sections together.

### Methods and sources footer
- Auto-generated from `data/sources.json`: each dataset, publisher, series ID, link, and "as of" date.
- A short methods note (indexing, PPP, ACS 5-year estimates, CBO baseline vintage).

### Cross-cutting requirements
- Responsive to phone width (no horizontal scroll; the globe gets a fixed-height container and works with touch).
- Accessible: each chart has a text summary (`aria-label` or visually hidden description), sufficient contrast, and keyboard-reachable toggles.
- Graceful fallback: if WebGL is unavailable, show a static D3 world choropleth or image in place of the globe.
- Light/dark theming consistent with the portfolio, if the housing map supports it.

---

## 4. Data pipeline

**Pattern:** a Python fetch script writes static JSON into `data/`. The site reads only those files at runtime. No API keys ever reach the browser. Jack reruns the script by hand to refresh.

```
scripts/
  fetch_all.py          # runs every fetcher, writes data/*.json, data/sources.json, data/facts.json
  fetchers/
    fred.py             # FRED API (needs FRED_API_KEY from .env)
    census_acs.py       # Census ACS 5-year API (key optional)
    fed_dfa.py          # Fed Distributional Financial Accounts CSV
    worldbank.py        # World Bank Indicators API (no key)
    cbo.py              # CBO projection data (downloaded file, see below)
    oecd.py             # OECD poverty rate (or a cached CSV if the API is painful)
data/
  *.json                # one file per chart/map
  sources.json          # provenance manifest
  facts.json            # headline numbers referenced by prose + refresh date
.env.example            # FRED_API_KEY=, CENSUS_API_KEY=
```

- `.env` is gitignored; `.env.example` is committed.
- Each JSON output is shaped for its chart (tidy, small, with no unused columns).
- `facts.json` holds the computed values the prose cites (e.g. "% change in tuition since 2000", "latest debt/GDP", "US GDP per capita rank").
- The script prints a one-line summary per dataset (rows, date range) so Jack can sanity-check.

### Candidate sources (verify all IDs)

| Use | Source | Candidate IDs / endpoint |
|---|---|---|
| CPI overall | FRED / BLS | `CPIAUCSL` |
| Shelter, rent | FRED / BLS | `CUSR0000SAH1`, `CUSR0000SEHA` |
| Medical care | FRED / BLS | `CPIMEDSL` |
| College tuition | FRED / BLS | `CUSR0000SEEB01` |
| Goods that fell | FRED / BLS | TVs `CUSR0000SERA01`; find series for computers/software, toys |
| Median weekly earnings | FRED / BLS | `LES1252881500Q` (nominal) |
| Home value, income, rent burden by state | Census ACS 5-year | `B25077`, `B19013`, `B25071` |
| Net worth shares | Fed DFA (or FRED mirrors) | DFA CSV; FRED `WFRBST01134` (top 1%), `WFRBSB50215` (bottom 50%), plus the middle groups |
| Debt held by public % GDP | FRED / CBO | `FYGFGDQ188S` or equivalent; CBO historical + baseline |
| Net interest vs. defense | FRED (NIPA) | interest `A091RC1Q027SBEA`; defense `FDEFX` (confirm comparable units) |
| Foreign holdings | FRED / Treasury TIC | `FDHBFIN` with total debt for share |
| 10-year yield | FRED | `DGS10` (resample to monthly) |
| GDP per capita PPP | World Bank | `NY.GDP.PCAP.PP.KD` |
| Poverty headcount | World Bank | `SI.POV.DDAY` (latest year per country; label the line and year) |
| Relative poverty | OECD | poverty rate after taxes and transfers |
| CBO projections | CBO | latest Budget and Economic Outlook / Long-Term Budget Outlook data file; record the vintage |
| Geometry | us-atlas, Natural Earth | `states-10m.json`; Natural Earth 110m countries GeoJSON |

**Known gotcha:** Natural Earth's `ISO_A3` is `-99` for some countries (e.g. France, Norway). Join World Bank data on `ADM0_A3` or `ISO_A3_EH` instead. Log it in LEARNING.md.

---

## 5. Prose workflow

- Jack writes **bullet points per section** in `content/bullets.md` (template with four section headers; create it in Phase 0).
- In Phase 5, Claude drafts the paragraphs from his bullets into `content/sections/*.md` (or the stack's equivalent), citing numbers only from `facts.json`.
- Jack edits the final wording. Do not invent arguments that aren't in his bullets; mark any gaps as `TODO(Jack)`.

---

## 6. Deployment

- New repo (suggested name: `two-cents`) deployed to GitHub Pages via GitHub Actions, the same pattern as the housing map.
- After the deploy works, add a project tile/link on the portfolio homepage (`~/Projects/portfolio`), matching existing tiles. Jack commits that change himself.

---

## 7. Phases and checkpoints

| Phase | Target time | Deliverable | Checkpoint |
|---|---|---|---|
| 0. Scaffold | 0:30 | Repo structure, stack copied from housing map, page skeleton with 4 empty sections + nav, `bullets.md` template, `LEARNING.md`, Pages workflow | Page runs locally |
| 1. Data pipeline | 1:30 | `fetch_all.py` and fetchers, all `data/*.json`, `sources.json`, `facts.json` | Script runs clean; summary printed |
| 2. Sections 1–2 | 1:30 | Charts 1a, 1b, Map 1, Chart 2a (2b if time) | Interactions work locally |
| 3. Section 3 | 1:00 | Charts 3a, 3b, 3c + explainer | — |
| 4. Section 4 | 2:00 | globe.gl globe with toggle, WebGL fallback, Chart 4a | Globe works on desktop + phone width |
| 5. Prose + polish | 1:00 | Drafted prose from bullets, methods footer, accessibility pass, mobile pass, deploy, portfolio link | Live URL |

Total: 7.5 hours, with 30 minutes of slack.

---

## 8. Cut list (in this order, if behind)

1. Chart 2b (asset composition)
2. Chart 3c (foreign holdings + yield)
3. Globe extruded polygons (keep the flat-colored globe)
4. Chart 4a (OECD relative poverty); move the caveat into prose
5. Map 1 rent-burden toggle (keep price-to-income only)

Never cut: the data pipeline + `sources.json`, the globe itself, the methods footer, mobile layout.

---

## 9. Out of scope for v1

AI chat, scheduled auto-refresh (GitHub Actions cron), scrollytelling, county-level data, and state drill-downs. Log these as ideas in LEARNING.md's "Next" section.
