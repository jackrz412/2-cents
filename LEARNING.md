# Learning log

What each phase introduced and why things are the way they are. Short and
concrete; newest phase at the bottom of each list.

## Glossary

### Phase 0

- **Static site.** A website that is only files (HTML, CSS, JavaScript, JSON, fonts) served as is. No server runs code per visitor. Here: everything in `_site/`.
- **Build step.** A script that turns source files into the files you publish. Here `scripts/build_site.py` copies `site/` and `data/` into `_site/` and fills the placeholders in `index.html`.
- **Placeholder / template.** A marker in a file that the build replaces with real content. Here `{{section:wealth}}` becomes the HTML from `content/sections/wealth.md`, and `{{fact:refresh_date}}` becomes that value from `data/facts.json`.
- **Markdown.** Plain text with light marks (`#` for headings, `-` for bullets, `**bold**`) that converts to HTML. Your prose lives in `content/sections/*.md`, so you can edit wording without touching HTML.
- **Virtual environment (`.venv/`).** A private copy of Python for one project, with its own installed packages, so this project's packages never clash with another's. Run things with `.venv/bin/python`.
- **Dependency / pinning.** A package the code needs (`markdown`), listed in `requirements.txt` with an exact version (`==3.9`), so your laptop and GitHub's build machine run the same code.
- **`.env` / `.gitignore`.** `.env` holds secrets (the FRED key) as `NAME=value` lines. `.gitignore` lists files Git never tracks, so `.env` can't be committed by accident. `.env.example` is the committed, empty template.
- **GitHub Actions / workflow.** GitHub's machines running steps you list in a YAML file on every push. `.github/workflows/deploy.yml` builds `_site/` and publishes it to GitHub Pages.
- **CSS custom properties ("design tokens").** Named values like `--color-accent: #1f4e79` defined once in `:root` and reused everywhere. Change the token, everything using it changes. Top of `site/styles.css`.
- **`prefers-color-scheme`.** A CSS media query that reads the reader's system light/dark setting. The dark values are under it in `styles.css`.
- **Self-hosted fonts / `woff2`.** The font files are in the repo (`site/fonts/`) rather than loaded from Google, so the page makes no third-party requests. woff2 is the compressed web font format.
- **`unicode-range` / subsets.** Each font file covers a range of characters (Latin, Latin Extended). The browser downloads a file only if the page uses one of its characters.
- **Sticky positioning.** `position: sticky` keeps an element in normal flow until it reaches the top of the window, then pins it there. The section nav uses it.
- **IntersectionObserver.** A browser API that tells JavaScript when an element enters or leaves a region of the window, without checking on every scroll. `site/js/nav.js` uses it to track which section you're reading.
- **`aria-current` / ARIA.** ARIA attributes describe a page's state to screen readers. `aria-current="location"` marks the nav link for the section in view; the CSS styles that same attribute, so the visual and the spoken state can't disagree.
- **Local preview server.** `python3 -m http.server -d _site 8001` serves `_site/` at http://localhost:8001 (8000 is the housing map's). Opening `index.html` straight from disk would block the JSON loads charts need later (browsers restrict `file://` pages).

### Phase 1

- **API (application programming interface).** A web address built for programs rather than people: you ask in a fixed format and get data back (here JSON or CSV). FRED, BLS, World Bank and OECD all have one; each fetcher in `scripts/fetchers/` talks to one.
- **API key.** A personal code that identifies you to an API. FRED's lives in `.env`, is put into the request URL at run time, and is never printed or saved. Rate limits are tied to it.
- **Rate limit.** How many requests an API allows per period. BLS's keyless API allows 25 requests a day, 25 series and 10 years each, so `bls.py` asks for all CPI series together in decade-sized chunks: 3 requests per refresh.
- **Bot check / 403.** HTTP status 403 means "forbidden." CBO, BLS's website and OECD's website answer scripts with one (a browser gets through). That's why the CBO file is downloaded by hand.
- **Series ID.** The code a statistical agency gives one time series (`CUSR0000SA0` = all-items CPI, seasonally adjusted). In BLS CPI IDs, `CUSR` = seasonally adjusted, `CUUR` = not.
- **Seasonal adjustment (SA / NSA).** Removing the regular pattern of each year (tuition jumps every fall, toys every December) so month-to-month moves show the trend. NSA = the raw numbers.
- **Index number (2000 = 100).** Each value divided by the 2000 average, times 100. 194 means "1.94× its 2000 level", so lines with different units (prices, dollars of wages) share one axis.
- **Fiscal year (FY).** The federal budget year, October to September; FY2025 ended September 30, 2025. OMB and CBO data are by fiscal year, calendar data by calendar year.
- **TIC (Treasury International Capital).** Treasury's survey of foreign holdings of US securities; the source of `FDHBFIN`.
- **PPP (purchasing power parity).** Converting incomes at what money buys locally, not at market exchange rates, so a dollar of GDP means the same basket of goods everywhere. "Constant 2021 international $" also removes inflation.
- **SDMX.** A standard format statistics agencies (OECD, IMF, Eurostat) use for data APIs. The query key `.A.PR_INC_DISP...` picks one value per dimension, in a fixed order.
- **ISO3 / FIPS codes.** Standard IDs: ISO 3166 three-letter country codes (`USA`) and the Census's two-digit state codes (`06` = California). Data files join to map shapes on these, never on names.
- **Aggregates.** Rows for groups rather than countries ("World", "High income"). The World Bank API mixes them in; `worldbank.countries()` filters them out.
- **Python package / `__init__.py`.** A folder of modules you can import from. The empty `scripts/fetchers/__init__.py` makes `from fetchers import bls` work; `from .common import ...` inside it means "from this package."
- **Vendoring.** Keeping a pinned copy of a third-party file in your repo (`site/geo/states-10m.json`), with its source and checksum, instead of loading it from someone else's server at run time.
- **Checksum (SHA-256).** A fingerprint of a file's exact bytes. If the recorded checksum still matches, the file hasn't changed.

## Decision log

### Phase 0

| # | Decision | Alternatives | Why |
|---|---|---|---|
| 0.1 | Plain HTML/CSS/JS, D3 from a CDN later, no npm | Astro like the portfolio; Vite | Matches the housing map (spec rule 1). One page needs no framework, and nothing to install for the front end. |
| 0.2 | Python build script (`scripts/build_site.py`) instead of the housing map's `build_site.sh` | Shell script; JS fills numbers at runtime | Prose is Markdown with `{{fact:...}}` placeholders, which a shell script can't render. Filling numbers at build time puts them in the HTML itself, which is better for search and screen readers, and a missing fact fails the build instead of shipping a blank. |
| 0.3 | One dependency, `markdown==3.9` | Hand-written converter; `python-markdown` extras | Small, well-known, and the only way to keep prose in Markdown without a framework. |
| 0.4 | Spec's folder layout (`scripts/fetchers/`, flat `data/`) plus the housing map's `site/` and `_site/` | Housing map's `pipeline/` + `data/processed/` | Spec section 4 names these paths; `site/` → `_site/` keeps source and output apart the way the housing map does. |
| 0.5 | Light colors and type scale from the portfolio (`#faf8f3` paper, `#1f4e79` navy); dark colors from the housing map | Housing map's cooler `#f9f9f7` / `#215da5` | Spec asks for soft paper + navy, which is the portfolio. The portfolio has no dark mode; the housing map does, and the spec says follow it if it does. No toggle button, matching the housing map. |
| 0.6 | Added IBM Plex Mono 400 (Fontsource 5.2.7) to the housing map's Sans/Serif files | Skip Mono | Spec lists Mono; it's used for series IDs in the methods footer, as the portfolio uses it for IDs. |
| 0.7 | Deploy workflow copied from the housing map, without its validation step and without the weekly refresh | Copy both workflows | Scheduled refresh is out of scope for v1 (spec section 9); validation can come back once there's data to check. |
| 0.8 | `.env` read by a small hand-written parser (Phase 1), as in the housing map | `python-dotenv` | Fewer dependencies; it's ten lines. |
| 0.9 | Facts show "—" until `data/facts.json` exists | A placeholder date | Spec rule 4: no number or date on the page that doesn't come from the pipeline. |
| 0.10 | Section nav: a sticky bar of four coin-dots across the top, labels hidden on phones except the current one | Portfolio's left-margin list (wide screens only) | The spec wants the nav to show reading progress at every width; the coin-dots carry the penny motif. Logic (IntersectionObserver band) reused from the portfolio's `SectionNav`. |
| 0.11 | Repo is `jackrz412/2-cents` (Jack's choice; the spec suggested `two-cents`); all paths relative | Hard-coded `/2-cents/` base | The live URL is `jackrz412.github.io/2-cents/`, and relative paths work under any name, so a rename costs nothing. |
| 0.12 | Header's Contact link points to `/contact/` | `/#contact` as in the housing map | The portfolio's `contact-page` branch moves Contact to its own page. If that isn't merged when this ships, switch it back. |

### Phase 1

Series ID changes from the spec's candidate table (spec rule 5):

| Spec candidate | What we found | Used instead |
|---|---|---|
| `CUSR0000SEEB01` tuition, `CUSR0000SERA01` TVs (FRED) | Not on FRED; FRED doesn't carry every BLS item index. Both exist at BLS. | All CPI series straight from the BLS API (`bls.py`) |
| "find series for computers/software, toys" | — | `CUUR0000SEEE01` computers, `CUUR0000SEEE02` software, `CUUR0000SERE01` toys, plus `CUUR0000SEEE04` phones |
| `FYGFGDQ188S` debt/GDP | Quarterly, starts 1970: no WWII. FRED's annual `FYPUGDA188S` reaches 1939 but is computed differently: 97.8% for FY2025, vs. 99.5% in OMB's own table and 99.4% at CBO | OMB Historical Table 7.1, FY1940–2025, which meets the CBO projection without a jump |
| `A091RC1Q027SBEA` interest, `FDEFX` defense (NIPA) | Gross interest *payments*, not net interest; defense is consumption + investment, a different concept from outlays | OMB Historical Table 3.1: Net Interest and National Defense outlays, same table, units and fiscal years, 1940–2025 |
| `DGS10` daily, resample | Works, but FRED already publishes the monthly average | `GS10` |
| Middle wealth groups | — | `WFRBSN09161` (90th–99th), `WFRBSN40188` (50th–90th) |
| `SI.POV.DDAY` | Same ID, but the line moved in 2025 from $2.15 (2017 PPP) to $3.00 (2021 PPP) | Same ID; labeled "$3.00 a day (2021 PPP)" |
| Census ACS API "key optional" | The API now redirects keyless requests to `missing_key.html` | ACS bulk summary files at www2.census.gov (no key), as the housing map does |
| Fed DFA CSV (`fed_dfa.py`) | FRED mirrors the four net-worth shares | FRED; no DFA fetcher unless Chart 2b (first on the cut list) gets built |

| # | Decision | Alternatives | Why |
|---|---|---|---|
| 1.1 | Fetchers only fetch; `fetch_all.py` shapes the chart files and facts | Each fetcher writes its own JSON | Several charts mix sources (Chart 1a is BLS + FRED; 3c is two FRED series), and facts compare across them. One place for all shaping is easier to read top to bottom. |
| 1.2 | Index base = the 2000 *average* (12 months, or 4 quarters for wages) | January 2000 = 100 | One month is noisy; the annual average is what BLS uses for base periods. |
| 1.3 | Chart 1a lines use seasonally adjusted CPI; Chart 1b bars use not seasonally adjusted, latest 12 months vs. 2000 average | One kind for both | Monthly lines look jagged without adjustment. For a 26-year % change, BLS recommends unadjusted data (adjustment factors get revised), and TVs/software only come unadjusted. Averaging 12 months cancels the seasons. |
| 1.4 | Net interest vs. defense from OMB, actual years only | OMB including its 2026–2031 estimates; NIPA from FRED | OMB has both lines in one table on the same basis. The estimate columns are the administration's budget proposals, so they'd bring policy into a descriptive page. |
| 1.5 | CBO workbook downloaded by hand into `data/raw/cbo/`: the "10-Year Budget Projections" file from The Budget and Economic Outlook (now `51118-2026-02-Budget-Projections.xlsx`, February 2026). `cbo.py` reads Table 1-1's "Debt held by the public" row in the % of GDP block and takes the vintage from the file name | Scripted download | cbo.gov answers scripts with a bot check (403). The spec already lists CBO as a downloaded file. Without it the pipeline still runs and Chart 3a shows history only. When CBO publishes a new baseline, download the new file into the same folder; the newest-named one wins. |
| 1.6 | Second dependency, `openpyxl==3.1.5`, pipeline only | Parse the .xlsx zip by hand with the standard library | OMB and CBO only publish Excel workbooks; openpyxl is the standard reader, and a hand parser would be fragile. |
| 1.7 | Raw downloads in git-ignored `data/raw/`; only the small chart JSON is committed | Commit raw files | The three ACS files are ~54 MB; the outputs are ~110 KB total. |
| 1.8 | GDP per capita rank uses one year for everyone (the latest year most countries report, now 2025), and adds a second rank among countries of 10M+ people | Each country's latest value | Ranking 2025 values against 2023 ones isn't a fair race. The 10M+ rank is there because the top of the raw list is small, rich places like Luxembourg and Singapore; the prose can say which comparison it uses. |
| 1.9 | Relative poverty limited to the 38 OECD members (37 with data: Colombia has none) | Everything the OECD feed returns | The spec says rich (OECD) countries; the feed also includes some partner countries. Membership is a fixed list, not a statistic, so it's fine in code. |
| 1.10 | facts.json values are rounded numbers or ready-to-print strings (`"76,931"`, `"October 2026"`) | Raw floats, formatted in the build | Prose should print exactly what was checked; rounding happens once, in the pipeline. |
| 1.11 | State names come from the vendored map file (`site/geo/states-10m.json`), not typed into code | A FIPS→name dictionary | One home for state names, and the map in Phase 2 uses the same file. |
| 1.12 | Wealth shares checked to sum to ~100% each quarter; CPI series checked to have all 12 months of 2000; CBO's last actual year checked to be within 1 point of OMB's | No checks | Cheap guards that stop a bad refresh from writing quietly wrong files. The CBO check is what caught the FRED debt series mismatch (row above). |
| 1.13 | Debt history and the interest/defense lines both from OMB Historical Tables, the projection from CBO | FRED for history | Same publisher and vintage for all of Section 3's budget history, and CBO and OMB agree on the year they share (99.4% vs. 99.5%). The cost is 1939, which Table 7.1 doesn't have. |

## Next (ideas, out of scope for v1)

- AI chat over the data.
- Scheduled data refresh (GitHub Actions cron), as in the housing map.
- Scrollytelling (charts that change as you scroll).
- County-level data and state drill-downs.
- A light/dark toggle button.
