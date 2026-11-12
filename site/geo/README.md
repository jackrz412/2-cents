# Vendored US state map

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
