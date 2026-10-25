import type { AvailabilityState, MapPoint } from './Content'

// One published card that has a place on the map (spec map.md M2), as
// returned by GET /api/map/features/. `type` is the card type's key — the
// same string the SPA uses for its route and its layer.
export interface MapCardFeature {
  id: string
  type: string
  title: string
  // False for a draft (spec map.md M5): the server adds the drafts this reader
  // may already read — their own, or every one for an admin — and nobody
  // else ever receives one. Drawn hollow, listed as *bozza*.
  is_published: boolean
  // The card's first image (spec/design.md D5) — `null` when it has none, in
  // which case the SPA draws a type-coloured placeholder rather than nothing.
  cover: string | null
  points: MapPoint[]
  route: MapPoint[]
  // The editorial zones it is in (spec cosa-fare.md Part −1, D2): a place by
  // its pin, a festa where its procession stops. Empty outside every zone.
  zones: string[]
  // A luogo's genre slug (null for every other type) — what «Cosa si può fare
  // qui» files it under (D4).
  genre?: string | null
  // A business's kind (null for every other type) — what files it under
  // «Bere» or «Mangiare» there (ADR-0010).
  kind?: string | null
  // How one gets in, only when someone knows (ADR-0008); never the hours,
  // which are read on the card with their date.
  access?: AvailabilityState | null
}

// GET /api/map/zone/ — an editorial zone, not an official boundary (D2).
// `count` is the published places (chiese and luoghi) in it.
export interface Zone {
  slug: string
  name: string
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
  count: number
}

// GET /api/map/zone/alias/ (review of 2026-10-22, decision 3): what a guest
// calls the place they stand in, and the slug of the zone it is in, in the
// author's order. The field «Dove sei?» matches against these in the browser.
export interface ZoneAlias {
  name: string
  zone: string
}

// GET /api/map/overlays/ (spec map.md M3). The list is already filtered by
// the server for who is asking (politics.md) — there is deliberately no
// visibility field here to filter on, and the SPA must never grow one.
export interface Overlay {
  id: string
  name: string
  kind: 'raster' | 'vector'
  position: number
  geojson: unknown | null
  color: string
  imageURL: string | null
  bounds: [[number, number], [number, number]] | null
  opacity: number
}
