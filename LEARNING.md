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

### Phase 2

- **D3.** A JavaScript library for drawing charts from data: it turns numbers into positions (scales), builds SVG shapes (lines, areas, map paths), and attaches events. Loaded from jsDelivr at a pinned version (`d3@7.9.0`), as on the housing map.
- **SVG.** The browser's vector drawing format: shapes described as text (`<path d="M10,20 L30,40">`), crisp at any size, and styleable with CSS. Every chart here is one `<svg>`.
- **Scale.** A function from data to screen: `x(2010)` returns a pixel position. `scaleUtc` for dates, `scaleLinear` for numbers, `scaleBand` for bar rows, `scaleThreshold` for map color classes.
- **Threshold scale / fixed breaks.** Colors chosen by which interval a value falls in (`< 3×`, `3–4×`, ...), with the break points set by hand rather than by the data's quantiles. Same rule as the housing map (its DECISIONS 011).
- **Projection (`geoAlbersUsa`).** The math that flattens latitude/longitude onto a page. Albers USA is the standard US map projection, with Alaska and Hawaii moved into insets. `fitSize` scales it to the box.
- **TopoJSON / `topojson.feature`.** A compact map format that stores shared borders once. `topojson.feature` turns it back into one shape per state; `topojson.mesh` draws only the internal borders, so each is drawn once.
- **ES module (`type="module"`).** A JavaScript file that `import`s from others (`import { load } from "./common.js"`). Lets each chart be its own file without a bundler. Modules run after the page is parsed.
- **Stacked area / `d3.stack`.** Areas piled on top of each other so each band's thickness is one group's share and the top edge is the total (here 100%).
- **Crosshair tooltip.** A vertical line that snaps to the nearest date under the pointer, with a box listing every series at that date. You aim at a date, not at a 2px line.
- **ResizeObserver.** A browser API that reports when an element changes size. Each chart redraws at its new width (phone rotation, window resize).
- **Roving tabindex.** One element in a group is in the Tab order (`tabindex="0"`), the rest are `-1`; arrow keys move between them. The map is one Tab stop, not 51.
- **Colorblind (CVD) check.** Simulating common color-vision deficiencies and measuring how far apart two colors still are (ΔE). The dataviz skill's validator script does the math; chart colors were picked from steps that pass.
- **Browser cache / cache busting.** Browsers keep copies of files they've downloaded and may reuse them instead of asking again. If the page's scripts are new but its cached `styles.css` is old, charts draw without their styles (SVG shapes default to black fill). Cache busting gives each build's files a new URL (`styles.css?v=43ee5b1bb3`), so a changed file can't be served from an old copy. `build_site.py` adds the version.
- **Ordinal ramp.** Shades of one hue, light to dark, for categories that have an order (wealth groups). A ramp says "more", which unrelated hues can't.

### Phase 3

- **Small multiples.** Several small charts side by side with the same axes, instead of one chart with two y-axes. Chart 3c's two panels share a time axis; each has its own y-scale, which is honest because they're separate charts.
- **Dual-axis chart.** One plot with two different y-scales (left and right). Avoided: how the two scales line up is arbitrary, so the chart can suggest a relationship that isn't in the data.
- **Projection vs. forecast.** CBO's baseline is a *projection*: what happens if current law stays as written. It's not a prediction of what Congress will do. The dashed line and the shaded "Projection" span mark it.
- **Nominal vs. % of GDP.** Nominal dollars are the face value each year (not adjusted for inflation). % of GDP divides by the size of the economy, so 1945 and 2025 are comparable. Chart 3b offers both because they tell different parts of the story.
- **Reusable component.** One piece of code used in several places with different settings. `site/js/charts/timeline.js` draws Charts 3a, 3b and 3c from an options object (series, axis, annotations, end labels).

### Phase 4

- **WebGL / Three.js / globe.gl.** WebGL is the browser's interface to the graphics chip, for drawing 3D. Three.js is the standard library on top of it; globe.gl is a library on top of Three.js that draws a globe with country shapes. Loaded from jsDelivr at a pinned version.
- **Lazy loading.** Fetching something only when it's needed. globe.gl is about 1.8 MB, so `globe.js` loads it only when the reader scrolls within a screen of the globe.
- **Feature detection / graceful fallback.** Checking whether the browser can do something (here: create a WebGL context) instead of guessing from its name, and showing something simpler if not. Without WebGL, or if globe.gl fails to load, the page draws a flat D3 world map.
- **GeoJSON.** The plain (not TopoJSON) format for map shapes: each country a feature with an id, properties and coordinates. `site/geo/countries-110m.json`.
- **Map projection (`geoNaturalEarth1`).** The flat fallback uses Natural Earth projection, a compromise that keeps both shapes and areas reasonable for a whole-world map.
- **OrbitControls / auto-rotate.** The Three.js camera control behind drag-to-spin and scroll-to-zoom. `autoRotate` turns the globe slowly until the first drag, scroll or tap.
- **`prefers-reduced-motion`.** A setting people turn on when motion makes them dizzy. The globe respects it: no auto-rotate and no animated transitions.
- **`aria-live`.** Marks a part of the page whose text changes, so screen readers announce the new text. The coins-per-person line uses it.
- **Largest remainder rounding.** Rounding parts so they still add up to the whole: round everything down, then give the leftover units to the parts with the biggest fractions. The 100-coin graphic uses it.

### Phase 5

- **Nominal GDP.** The value of everything an economy produces, in today's dollars (not adjusted for inflation). FRED's `GDP` series is a seasonally adjusted *annual rate*: one quarter's output scaled up to a year.
- **Market exchange rates vs. PPP.** Total GDP compared at market exchange rates (World Bank `NY.GDP.MKTP.CD`) shows the US as the largest economy; adjusted for local prices (PPP), China's is larger. The globe uses PPP per person, the fairer measure of living standards. Its total GDP view uses market exchange rates.
- **Gross debt vs. debt held by the public.** Gross federal debt (FRED `GFDEBTN`) is everything the Treasury owes. Part of it is owed to the government's own trust funds, such as Social Security (`FDHBATN`); the rest is *debt held by the public*, the measure economists usually compare with GDP.
- **Waffle chart.** A 10x10 grid in which each square is 1% of a whole. It shows parts of a whole like a pie, but squares are easier to count than angles are to judge.
- **`prefers-reduced-motion`.** A system setting some readers turn on because motion makes them dizzy or distracts them. CSS and JS can read it; this page then skips every scroll animation.

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

### Phase 2

| # | Decision | Alternatives | Why |
|---|---|---|---|
| 2.1 | One ES module per chart in `site/js/charts/`, plus `common.js` (data loading, tooltip, table, chips, resize) and `main.js` | One big script like the housing map's `map.js`; a bundler (Vite) | Four (later nine) charts share the same pieces; modules let each file stay short without adding npm or a build tool. A failed chart shows a note in its own figure and leaves the rest running. |
| 2.2 | Chart titles, subtitles and source lines are in `index.html`; the scripts add the plot, controls and table | Build everything in JavaScript | The text is readable without JavaScript and by search engines, and the period labels come from `facts.json` through the build, like the prose. |
| 2.3 | Chart colors from the dataviz reference palette, checked with its validator against this page's backgrounds (`#faf8f3` light, `#0d0d0d` dark); dark mode has its own steps | Housing-map colors; one set for both modes | The housing map only has map ramps, not line colors. All four line colors pass the colorblind and normal-vision checks in both modes. Light-mode aqua and yellow are under 3:1 contrast against the paper, so the chips (legend), tooltip and table carry every value too. |
| 2.4 | Map breaks: price to income 3 / 4 / 5 / 6, rent burden 28 / 30 / 32 / 34%. The housing map's warm ramp, the same in both modes | Quantiles; a continuous scale | Fixed breaks keep a color's meaning when the data updates. 3, 4 and 5 are the usual "affordable / moderately / seriously / severely unaffordable" lines for price to income (Demographia's categories); 6 splits off the extreme states. 30% of income is HUD's cost-burden line, so it sits on a break. |
| 2.5 | Chart 1a: overall CPI in gray (the reference), wages in the text color, the four core costs in colors 1–4; each line labeled at its end with its latest value (desktop), spread apart where lines end close together, with a short leader line back to the line | Six categorical colors; no end labels (chips and tooltip only) | The story is core costs vs. the two references, so those stand apart by being neutral. The first version had no end labels; on review the chart didn't explain itself at a glance, so they were added. On phones there's no room, so the chips (legend) and tooltip carry it. |
| 2.6 | Chart 1b: rises orange, falls blue, overall CPI gray; wage growth as a vertical rule | One color for every bar | Up and down are opposite meanings, so they get opposite (warm/cool) hues. The wage rule answers "did this outrun my pay?" at a glance. On phones each category name moves above its bar. |
| 2.7 | Chart 2a: one blue ramp (darkest = top 1%), labels inside the three wide bands. *Revised in Phase 5 (Jack):* top 1% on top, bottom 50% on the baseline | Top 1% on the baseline (the first version); four unrelated hues | Stacked like the distribution it shows, and in the same order as the legend and tooltip. The top 1% still reads against a flat edge: the 100% line at the top. The bottom 50%'s band (2–4%) is too thin for a label; the legend and tooltip carry it. |
| 2.8 | Every chart gets a closed "Show the data" table, an `aria-label` summary built from the data, and keyboard reading (arrow keys on line/area charts, arrow keys between states on the map) | Tooltips only | The spec asks for text summaries and keyboard access; a table is the full equivalent for anyone who can't use the chart, and tooltips never hide a value that isn't elsewhere. |
| 2.9 | Chart 2b (asset composition) not built | Build it from the DFA CSV | First on the spec's cut list, and it needs a new fetcher (the DFA CSV isn't on FRED). Kept in "Next". |
| 2.10 | The build adds a content fingerprint (`?v=…`) to the stylesheet, scripts, module imports and data requests; key SVG attributes (`fill="none"` on lines, transparent hit areas) are set in JavaScript as well as CSS | Tell readers to hard-refresh; a no-cache dev server | A cached old `styles.css` with new scripts drew Chart 1a as black streaks and Chart 1b as black blocks (Jack saw this; the map was fine because its colors are set in the script). Versioned URLs fix it for everyone, including GitHub Pages' 10-minute cache, and the attributes mean a missing stylesheet gives plain black-and-white charts, not black shapes. |
| 2.11 | Charts 1a and 1b get a "Since 2000 / Since 1985" switch; 2000 stays the default and the base for the prose's facts (1985 facts get their own keys, e.g. `cpi_pct_since_1985`). The two switches are synced | One base year; 1985 as the default; a switch on 1a only | 2000 was the spec's choice, not a data constraint. A second base year is a robustness check: if core costs outrun wages from both starts, the point doesn't depend on a chosen year. (Picking a start year for drama would be cherry-picking.) Synced switches keep the two charts on the same span. 1985 is as far back as all six 1a lines go cleanly (rent from 1981, wages from 1979). |
| 2.12 | In the 1985 view, Chart 1b keeps the categories BLS didn't track yet as gray rows at the bottom, under a "No data back to 1985" divider, with the month each series starts; the table shows "—" | Drop them from the 1985 view; keep them in sorted order with empty bars | Dropping them would silently change what's being compared between views. Grouping them at the bottom keeps the 1985 ranking clean. The pipeline decides which items are missing (no full base year), so nothing is hard-coded. In the November 2026 refresh four were missing: day care and preschool (BLS series starts Dec 1990) and computer software, computers, and phones (all Dec 1997). |
| 2.13 | Wages stay as the median; removing the top 10% wasn't added as a filter | A "median excluding the top 10%" line | A median barely moves when the top 10% is removed: it becomes the 45th percentile of all workers. BLS's percentile series (FRED, from 2000) bracket it: 25th percentile +115% since 2000, median +109% (annual averages, 2000 to 2025). That's a few points, not a different story. The top 10% matters for an *average*, not a median. |
| 2.14 | Chart 2a gets a companion graphic below it: 100 people (1 / 9 / 40 / 50) beside 100 coins split by the latest quarter's wealth shares, same blue ramp; hovering a group highlights it in both grids; a text key gives the counts | Figures placed beside each band of the area chart | Jack's idea. Beside the bands didn't fit: the bottom 50%'s band is 2–4% tall, too thin for 50 figures. Coins are whole numbers that must add to 100, so shares are rounded by largest remainder (32.5% shows as 33 coins); the tooltip and table keep the exact share. Polish (Jack's request): centered under the chart, and the key became toggle buttons (`aria-pressed`) that pin a group's highlight in both grids; hover previews it. Then: a switch between the first quarter (Q3 1989) and the latest, with the coins that change group animating over; a coins-per-person line ("about 710×" now, 330× in 1989, from exact shares, rounded to 2 significant figures); a one-time fill-in animation on first view; and the picked group also highlights its band in the area chart. All motion is skipped with reduced motion. |
| 2.15 | In Chart 1b, the wage rule is drawn above the bars but below the labels, and the labels get a thin halo in the page color | Move the wage label to the side; draw the rule behind the bars | In the 1985 view, wages (+260%) land right where several value labels sit (+230%, +208%). A halo keeps both readable without hiding the rule inside the bars. |
| 2.16 | A number line ($10K, $100K, $1M, $1B, $100B) opens the wealth section: one linear line from $0, with a slider (and a Play button) that zooms out so the smaller amounts squeeze into $0 | A log-scale axis; a static graphic | A log axis spaces each tenfold step evenly, which hides exactly the point being made. A plain line can't show all five at once, so the zoom does the work. The slider is log-scaled so each tenfold step gets equal slider travel. Round amounts for scale, labeled as not data; the "1 inch → 158 miles" line is computed in code. Play is hidden under reduced motion. |

### Phase 3

| # | Decision | Alternatives | Why |
|---|---|---|---|
| 3.1 | One shared line-chart module (`timeline.js`) for Charts 3a–3c; Chart 1a keeps its own code | Copy Chart 1a three times; move 1a onto the shared module too | The three Section 3 charts are plain time series, so one module keeps them consistent. Moving 1a over (chips, two base years) would mean reworking a chart that already works; it can move later. |
| 3.2 | Chart 3a: history and projection are the same blue, projection dashed in a shaded "Projection" span; WWII, 2008 and COVID-19 annotated at FY1946, FY2009 and FY2020; the 2036 endpoint labeled | Different colors for history and projection | It's one measure, so one color; the dash and shading say "not actual". The 2008 note sits on FY2009 because the jump shows up in that fiscal year (October 2008 to September 2009). Annotation years are positions; every number shown comes from the data. |
| 3.3 | Chart 3b defaults to nominal dollars, with a switch to % of GDP | % of GDP only; inflation-adjusted dollars | Dollars show the headline (interest passed defense in FY2024). % of GDP is the honest counterpoint: relative to the economy, interest is about where it was in the early 1990s, and defense was over a third of GDP in WWII. Inflation adjustment would need a separate price index; % of GDP already removes inflation and growth. |
| 3.4 | Chart 3c as two small panels (foreign share; 10-year yield) on one time axis | One chart with two y-axes (the spec's "plus the 10-year yield as context") | Different units; a dual axis invents a correlation. Panels side by side on desktop, stacked on phones. |
| 3.5 | End-label connectors drawn in muted gray, with a short colored key beside each label (also in Chart 1a) | Connectors in the series color | Reviewing Chart 3b, a colored connector bending down to a spread-apart label looked like the line itself dropping. Gray connectors can't be mistaken for data. |
| 3.6 | "Can the US default?" drafted as `content/sections/debt_default.md` in an aside, no numbers or named events | Write it in Phase 5 with the rest of the prose | It's a Phase 3 deliverable in the spec. Kept conceptual (borrowing in your own currency, debt ceiling, interest costs, inflation, demand for Treasuries) and neutral; Jack reviews the wording in Phase 5. |

### Phase 4

| # | Decision | Alternatives | Why |
|---|---|---|---|
| 4.1 | Country shapes: Natural Earth 1:110m, slimmed by `scripts/vendor_countries.py` to id + name (169 KB), joined on `ISO_A3_EH`, Kosovo set to `XKX` | world-atlas TopoJSON (numeric UN codes); Natural Earth 1:50m | Natural Earth carries ISO3 codes, so it joins to the World Bank's directly. 1:110m is light enough for a phone and detailed enough at globe scale; small states missing at this scale are in the table. |
| 4.2 | globe.gl 2.46.2 loaded lazily; flat D3 map (Natural Earth projection) if WebGL is missing or the script fails | Load with the page; a static image as the fallback | 1.8 MB shouldn't delay the first three sections. A D3 fallback keeps the same colors, tooltip and legend and stays up to date with the data, which an image wouldn't. |
| 4.3 | Fixed breaks. GDP per person: $5K / 10K / 20K / 40K / 60K (each class roughly doubles). Extreme poverty: 1 / 5 / 15 / 30 / 50%. GDP in the blue ramp, poverty in the warm ramp, both the same in light and dark mode | Quantiles; a log-continuous scale | Fixed breaks keep meaning across refreshes, as on the state map. Doubling steps suit income, which spans 100× across countries. Different hues for the two metrics so a switch is never misread as the same scale. |
| 4.4 | The globe starts over North America and auto-rotates slowly until the reader drags, scrolls or taps; no auto-rotate with reduced motion; tap shows the tooltip on touch screens | Start over the Atlantic; always rotate | The US is the subject. Stopping on first touch means it stays where the reader put it. |
| 4.5 | Chart 4a: the US bar in the accent blue, every other country gray, US value labeled, OECD median as a rule | 37 bars in one color with every value labeled | The story is one country against the rest; graying the rest makes the US bar stand out without a legend. All values are in the tooltip and table. |
| 4.6 | Extruded country heights (cut list item 3) not built | Height by GDP | Flat colors already read clearly, and extrusion makes small countries harder to hover. Kept in "Next". |

### Phase 5

| # | Decision | Alternatives | Why |
|---|---|---|---|
| 5.1 | Prose is drafted from content/bullets.md, with every number as a `{{fact:...}}` placeholder; claims the data couldn't back were rewritten with Jack (e.g. "almost the entire pie" became "most of the pie"; "worse off than their parents" became "the essentials take a bigger bite") | Type numbers into the prose; keep claims as first written | A typed number goes stale on the next refresh, and a claim a reader can disprove with the chart right below it undercuts the whole page. |
| 5.2 | The "interest vs. a country's economy" comparison is computed: World Bank total GDP (current US$) is ranked, and the largest economy smaller than a year of net interest is named | Pick a country by hand | The first draft said "as much as Belgium", but Belgium's GDP is well below the interest bill. Computing it keeps the comparison right as both numbers change. |
| 5.3 | `{{fact:key\|abs}}` drops a value's sign | Store separate positive facts for every fall | "TV prices fell -99%" reads wrong; one modifier covers every falling price. |
| 5.4 | BLS responses are cached for the day in data/raw/bls/ | Always call the API | BLS v1 allows 25 requests a day and each refresh uses 5. A same-day rerun after a code fix shouldn't spend the quota. |
| 5.5 | Outside facts that would need new citations (credit ratings, the dollar's share of reserves, university rankings, oil output) stay in bullets.md as context, out of the prose | Cite them in the methods footer | Everything on the page should trace to sources.json. Any of them can come in later with a source entry. |
| 5.6 | Charts break out to 54rem (`--chart-width`), a little wider than the 46rem text, instead of 64rem | Text width, as in the LLM lab article; the full 64rem | Jack's call: close to the lab article's look, with a little extra room for end labels and the globe. The page frame keeps `--wide-width`. |
| 5.7 | Methods footer: a hand-written methods note (`content/sections/methods.md`) plus a source list the build generates from sources.json (`{{sources:list}}`); series lists longer than 4 fold into a "21 series" toggle | A hand-written source list | The list can't drift from the data: a new source in the pipeline shows up in the footer on the next build. |
| 5.8 | Number line: amount labels in outlined badges, $0 and the end value in larger, darker type, and the "1 inch" comparison as a pull quote with the last distance in bold (Jack's request) | Plain labels; the comparison as a small italic note | The labels are the point of the graphic. The quote is set in the sans, because only the 600 weight of the serif is loaded, so bold wouldn't stand out in it. |
| 5.9 | Chart 3d plots gross federal debt and nominal GDP on one dollar axis | Two y-axes; debt held by the public | Same unit, so one axis is honest and the crossing point means something. Gross debt is the "national debt" number people quote, and it's the total the ownership chart splits up. |
| 5.10 | Who owns the debt is a 10x10 waffle with a key giving dollars and shares, not a pie | Pie; one stacked bar | Squares are easier to count and compare than pie angles, each square is a plain "1%", and it matches the people-and-coins grids in Section 2. Domestic investors are computed as a remainder, so the four parts always add up to the total. |
| 5.11 | The globe's total GDP view uses the same blue ramp as GDP per person | A second hue (green) | Only one view shows at a time, and the dataviz guidance keeps one sequential hue unless two show at once. The legend title says which view is on. "Total wealth" is labeled as GDP (output per year), since GDP isn't a stock of wealth. |
| 5.12 | Scroll motion: text and charts fade up once as they enter, then plots fill left to right and grid squares pop in; set by a head script only without a reduced-motion preference, with a 3-second fallback that shows everything if reveal.js doesn't run | Animate every redraw; per-mark draw-in for each chart | Close to the LLM lab article's draw-in. One clip-path fill covers every SVG chart without touching chart code; after the first fill, resizes and toggles redraw instantly. |
| 5.13 | Accessibility and mobile pass: axe-core (WCAG 2.1 AA plus best practices) in light and dark at 1280 and 360px, a full Tab walk, a contrast check of every chart label, and every chart screenshotted at 360px. Fixes: data tables are focusable scroll regions; the globe has a Pause/Resume rotation button; touch screens get 40px controls; narrow timeline charts show a line key in place of end labels | Rely on the axe scan alone | axe can't judge SVG text contrast or whether a phone layout still makes sense. The key fix came from looking at the screenshots: below 500px, two lines were told apart by color alone. |
| 5.14 | The number line sits between the wealth section's 2nd and 3rd paragraphs (the prose is split into wealth.md and wealth_2.md). Its "1 inch" comparison moved behind a "Tell me in distance" button: a modal `<dialog>` that dims the page and types the sentence out, with its final size reserved so nothing shifts while it types | A `{{figure}}` marker inside one Markdown file; a custom overlay div | Splitting the file reuses the existing `{{section:...}}` placeholder. `<dialog>` with `showModal()` gives the dimmed backdrop, Escape to close, keeping focus inside and returning it to the button, all built in. Screen readers get the whole sentence from the dialog's label; reduced motion shows it at once. |
| 5.15 | Experiment: charts at the text width (`--chart-width: var(--content-width)`), and from 75rem (1200px) up the column widens to 50rem and the type steps up one size (body 17 to 18px, chart text 12 to 13px), so line length stays the same while everything gets bigger | Widen the column alone; keep charts at 54rem | Wider lines at the same type size get harder to read. Scaling both keeps the reading comfort and gives the charts more room. If it holds up, the LLM lab article gets the same step. |

## Next (ideas, out of scope for v1)

- AI chat over the data.
- Scheduled data refresh (GitHub Actions cron), as in the housing map.
- Scrollytelling (charts that change as you scroll).
- County-level data and state drill-downs.
- A light/dark toggle button.
- Globe: extruded countries (height by value).
- Chart 2b: asset composition by wealth group (equities vs. real estate), from the Fed's DFA CSV.
- Chart 1a: 10th and 90th percentile wage lines (BLS usual weekly earnings percentiles via FRED, the LEU02529112-15 series; verify IDs before use. Since 2000 view only, as they start in 2000). See decision 2.13.
