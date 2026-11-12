"""Assemble the deployable site in _site/.

- Copies site/ (page, styles, scripts, fonts, geometry) as is.
- Copies data/*.json to _site/data/, where the charts load them.
- Renders site/index.html, filling two kinds of placeholder:
    {{section:name}}  the Markdown in content/sections/name.md, as HTML
    {{fact:key}}      a value from data/facts.json (also works inside the Markdown)
- Adds ?v=<version> to the stylesheet, scripts and module imports, where the
  version is a fingerprint of the site and data files. A browser that cached
  an older styles.css would otherwise pair it with newer scripts, and charts
  drawn with missing styles turn into black shapes. A new version means a
  new URL, so the browser has to fetch the new file.

Used by the Pages workflow and for local preview, so both serve the same files.
Run with the project's virtual environment, which has the markdown package:

    .venv/bin/python scripts/build_site.py
"""
import hashlib
import json
import re
import shutil
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DATA = ROOT / "data"
SECTIONS = ROOT / "content" / "sections"
OUT = ROOT / "_site"

PLACEHOLDER = re.compile(r"\{\{\s*(section|fact):([a-z0-9_]+)\s*\}\}")
# Shown for every fact until the pipeline (Phase 1) has written facts.json.
NO_FACTS = "—"


def load_facts():
    path = DATA / "facts.json"
    if not path.exists():
        print(f"note: {path.relative_to(ROOT)} not found; facts show as {NO_FACTS}")
        return None
    return json.loads(path.read_text())


def fill_facts(text, facts):
    def sub(m):
        kind, key = m.groups()
        if kind != "fact":
            return m.group(0)
        if facts is None:
            return NO_FACTS
        if key not in facts:
            # Fail rather than publish a blank: a missing key is almost always a typo.
            raise SystemExit(f"error: facts.json has no key {key!r}")
        return str(facts[key])

    return PLACEHOLDER.sub(sub, text)


def render_section(name, facts):
    path = SECTIONS / f"{name}.md"
    if not path.exists():
        return '<p class="todo">Text for this section is still to come.</p>'
    return markdown.markdown(fill_facts(path.read_text(), facts))


def fingerprint():
    """Short hash of every file the page uses: changes whenever any of them does."""
    h = hashlib.sha256()
    for root in (SITE, DATA, SECTIONS):
        for p in sorted(root.rglob("*")):
            if p.is_file():
                h.update(str(p.relative_to(ROOT)).encode())
                h.update(p.read_bytes())
    return h.hexdigest()[:10]


# Local stylesheet and script references in index.html, and relative module
# imports ("./common.js") in the chart scripts.
LOCAL_ASSET = re.compile(r'((?:href|src)="(?:styles\.css|js/[\w/.-]+\.js))"')
MODULE_IMPORT = re.compile(r'(from "\./[\w.-]+\.js)"')


def add_versions(version):
    for js in (OUT / "js").rglob("*.js"):
        js.write_text(MODULE_IMPORT.sub(rf'\1?v={version}"', js.read_text()))
    return lambda page: LOCAL_ASSET.sub(rf'\1?v={version}"', page)


def main():
    facts = load_facts()

    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(SITE, OUT)

    (OUT / "data").mkdir()
    for f in sorted(DATA.glob("*.json")):
        shutil.copy(f, OUT / "data" / f.name)

    page = (SITE / "index.html").read_text()
    # Sections first, so facts inside the rendered Markdown are filled in too.
    page = PLACEHOLDER.sub(
        lambda m: render_section(m.group(2), facts) if m.group(1) == "section" else m.group(0),
        page,
    )
    page = fill_facts(page, facts)
    version = fingerprint()
    page = add_versions(version)(page)
    (OUT / "index.html").write_text(page)

    n = sum(1 for p in OUT.rglob("*") if p.is_file())
    print(f"built _site/ ({n} files, version {version})")


if __name__ == "__main__":
    main()
