# The map: layers & overlays

> **Delivered (C5, 2026-08-27.)** Leaflet, as today (the markercluster
> default-import gotcha still applies; TD-02's double bundle was paid first, as
> planned — see [tech-debt.md](../tech-debt.md#td-02)). The visibility gate M4
> asks for is recorded in [ADR-0006](../adr/0006-overlay-visibility-gate.md).

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

## What was built

- `backend/maps/` — the `Overlay` model (one model, both kinds) and two public
  endpoints: `GET /api/map/features/` (every published card that has a place,
  in one unpaginated payload) and `GET /api/map/overlays/` (per-reader
  contents, see below). The reports layer keeps its own v1 endpoint and
  filters. Overlays are authored in Django admin — the author supplies the
  boundaries and the scans, so there is no collaborator-facing editor.
- `frontend/src/components/maps/GaetaMap.vue` — the one map, renamed from
  `ReportsMap.vue` now that it draws more than reports; layer toggles and
  opacity sliders live in `HomeView.vue`, which owns which layers are on.
- **The gate (M4)**: `Overlay.objects.visible_to(user)`, default visibility
  `steering`, and no `visibility` field in any response. Rationale and the
  alternatives rejected: [ADR-0006](../adr/0006-overlay-visibility-gate.md).

Two decisions worth knowing, both narrower than the requirement:

- **Translated cards are excluded from the map.** A translation is a second
  `Card` row (C4), so including it would put two pins on one doorstep. The map
  indexes places; the reader picks a language inside the card.
- **M1's "minimal top menu" is not a chrome redesign.** The map is the landing
  view (it already was) and the layer toggles sit in the panel beside it; the
  nav keeps the C3 `SchedeMenu`. Making the map full-bleed with a floating
  menu is design work, and design is roadmap item 1 — not something to smuggle
  into a phase about geometry.

## Note

Routes (M2 feste) and zone polygons (M3) are both just geometry on the same
map the reader already sees — "the same Gaeta, shown differently", in the
author's words. No second map; overlays and layers compose on the one map.
