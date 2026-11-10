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
| 0.11 | Repo name `two-cents` (spec's suggestion); all paths relative | Hard-coded `/two-cents/` base | The live URL is `jackrz412.github.io/two-cents/`, but relative paths work under any name. |
| 0.12 | Header's Contact link points to `/contact/` | `/#contact` as in the housing map | The portfolio's `contact-page` branch moves Contact to its own page. If that isn't merged when this ships, switch it back. |

## Next (ideas, out of scope for v1)

- AI chat over the data.
- Scheduled data refresh (GitHub Actions cron), as in the housing map.
- Scrollytelling (charts that change as you scroll).
- County-level data and state drill-downs.
- A light/dark toggle button.
