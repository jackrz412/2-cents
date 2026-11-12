# Vendored map files

## US states

`states-10m.json` is copied unchanged from
[`@severo_bo/us-atlas-2023@4.0.0`](https://github.com/severo/us-atlas-2023),
the same package and version the housing map uses for its counties: the 2023
Census cartographic boundary files as TopoJSON, laid out like `us-atlas`.

- Source: `https://cdn.jsdelivr.net/npm/@severo_bo/us-atlas-2023@4.0.0/states-10m.json`
- SHA-256: `98a69095ad5f509c68163bf6327fd12c00a39af117da6fe80cb05c34157784bc`
- License: ISC (see `LICENSE`)

It also contains Puerto Rico and the other territories (FIPS above 56). The
pipeline and the page filter them out; the file stays untouched so it can be
checked against the checksum above.

## World countries

`countries-110m.json` is made from Natural Earth's 1:110m Admin 0 countries
(public domain) by `scripts/vendor_countries.py`, which keeps only an ISO3 id
and a name and rounds coordinates to 2 decimals (169 KB instead of 820 KB).

- Source: `https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson`
- Source SHA-256: `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f`
- License: public domain ([naturalearthdata.com/about/terms-of-use](https://www.naturalearthdata.com/about/terms-of-use/))

Ids are `ISO_A3_EH` (Natural Earth's `ISO_A3` is `-99` for France and
Norway), with Kosovo set to the World Bank's `XKX`. At this scale some small
countries (Singapore, Hong Kong, Bahrain, Mauritius) have no shape; their
values are in the globe's data table.
