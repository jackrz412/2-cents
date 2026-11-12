"""Make site/geo/countries-110m.json from Natural Earth's 1:110m countries.

Run once (or when updating the Natural Earth version); the output is committed.

    .venv/bin/python scripts/vendor_countries.py

Keeps only what the globe needs: an ISO3 code to join to the World Bank data,
and a display name. Coordinates are rounded to 2 decimals (about 1 km, far
finer than the 1:110m shapes), which cuts the file from ~840 KB to ~200 KB.

Join key: ISO_A3_EH, not ISO_A3. ISO_A3 is "-99" for France and Norway in
Natural Earth (their overseas territories make the code ambiguous);
ISO_A3_EH ("equivalent, harmonized") fills those in. Kosovo has no ISO code
at all; the World Bank calls it XKX. N. Cyprus, Somaliland and W. Sahara
have no World Bank data and stay gray.
"""
import hashlib
import json

from fetchers.common import ROOT, download

VERSION = "v5.1.2"
URL = f"https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@{VERSION}/geojson/ne_110m_admin_0_countries.geojson"
RAW = ROOT / "data" / "raw" / "ne" / "ne_110m_admin_0_countries.geojson"
OUT = ROOT / "site" / "geo" / "countries-110m.json"
OVERRIDES = {"KOS": "XKX"}  # ADM0_A3 -> World Bank code, where ISO_A3_EH is -99


def rounded(coords):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], 2), round(coords[1], 2)]
    return [rounded(c) for c in coords]


def main():
    path = download(URL, RAW, fresh=False)
    src = json.loads(path.read_text())
    features = []
    for f in src["features"]:
        p = f["properties"]
        iso3 = p["ISO_A3_EH"] if p["ISO_A3_EH"] != "-99" else OVERRIDES.get(p["ADM0_A3"], p["ADM0_A3"])
        geom = {"type": f["geometry"]["type"], "coordinates": rounded(f["geometry"]["coordinates"])}
        features.append({"type": "Feature", "id": iso3, "properties": {"name": p["NAME"]}, "geometry": geom})
    OUT.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))
    print(f"wrote {OUT.relative_to(ROOT)}: {len(features)} countries, {OUT.stat().st_size // 1024} KB")
    print(f"source sha256 {hashlib.sha256(path.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()
