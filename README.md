# My Two Cents on the US Economy

What I say when people ask an econ grad "so what do you think about the economy?":
four things I think every American should be watching, each with charts built from
public data. See [SPEC.md](SPEC.md) for the plan and [LEARNING.md](LEARNING.md) for
terms and decisions.

## Running it

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env                       # then add your FRED key

.venv/bin/python scripts/fetch_all.py      # refresh data/*.json (add --fresh to re-download raw files)
.venv/bin/python scripts/build_site.py     # site/ + data/ + content/ -> _site/
python3 -m http.server -d _site 8001       # preview at http://localhost:8001
```

## Layout

```
site/                page template, styles, scripts, fonts
content/bullets.md   my points per section (raw)
content/sections/    drafted prose per section (Markdown, with {{fact:...}} placeholders)
scripts/             build_site.py; fetch_all.py and fetchers/ (data pipeline)
data/                JSON the charts load, plus sources.json and facts.json (committed)
.github/workflows/   Pages deploy
```
