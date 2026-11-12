"""Helpers shared by the fetchers: paths, HTTP, .env, and the sources manifest."""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"

# Some servers (OECD, OMB) refuse requests without a browser-like User-Agent.
HEADERS = {"User-Agent": "Mozilla/5.0 (two-cents data pipeline; github.com/jackrz412)"}


def read_env():
    """{NAME: value} from the git-ignored .env file, the same ten-line parser
    as the housing map's (no python-dotenv dependency)."""
    env = {}
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def get(url, data=None, headers=None):
    """Bytes at url (POSTs `data` if given). Raises on HTTP errors."""
    req = urllib.request.Request(url, data=data, headers={**HEADERS, **(headers or {})})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def get_json(url, **kw):
    return json.loads(get(url, **kw))


def download(url, path, fresh=False):
    """Save url to path, unless it's already there (pass fresh=True to re-download)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if fresh or not path.exists():
        path.write_bytes(get(url))
    return path


def write_json(name, obj, pretty=False):
    """Write data/<name>.json. Sorted keys keep the bytes stable between runs,
    so a refresh only shows up in git where the data really changed. Chart files
    are compact; facts.json and sources.json are indented for reading."""
    out = DATA_DIR / f"{name}.json"
    text = json.dumps(obj, sort_keys=True, indent=2 if pretty else None,
                      separators=None if pretty else (",", ":"), ensure_ascii=False)
    out.write_text(text + "\n")
    return out


def source(id, dataset, publisher, url, as_of, series=None, notes=None):
    """One entry for data/sources.json (the methods footer is built from these)."""
    entry = {"id": id, "dataset": dataset, "publisher": publisher, "url": url, "as_of": as_of}
    if series:
        entry["series"] = series
    if notes:
        entry["notes"] = notes
    return entry
