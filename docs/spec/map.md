# The map: layers & overlays

> Phase C5. Leaflet, as today (markercluster default-import gotcha still
> applies; TD-02's double bundle should be fixed before this phase adds weight).

## Requirements

- **M1 — The map is the landing view** for everyone, logged in or not, with a
  minimal top menu: layer toggles plus the non-map sections (Ricette; the
  internal ones).
- **M2 — Layers.** Each content type with a footprint is a reader-toggleable
  layer: chiese (pins), feste (routes), ricette (sale points), personaggi
  (pins), and the existing reports layer. The map shows only what has a place;
  dialetto and recipes-as-articles are reached from the menu, not the map.
- **M3 — Overlays**, one mechanism, two kinds:
  - **raster** — historical maps of Gaeta (1820, 1600…): georeferenced images
    the author sources, drawn over the base tiles with adjustable opacity
    (`ImageOverlay`);
  - **vector** — zone polygons (GeoJSON): **quartieri**, and **seggi
    elettorali**.
- **M4 — The seggi overlay is confidential by default** — visible only to the
  steering tier ([politics.md](./politics.md)). The boundaries are public data,
  but the use is internal; making the layer public is a single explicit admin
  decision, never a side effect.

## Note

Routes (M2 feste) and zone polygons (M3) are both just geometry on the same
map the reader already sees — "the same Gaeta, shown differently", in the
author's words. No second map; overlays and layers compose on the one map.
