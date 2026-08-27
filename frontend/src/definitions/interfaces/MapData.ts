import type { MapPoint } from './Content'

// One published card that has a place on the map (spec map.md M2), as
// returned by GET /api/map/features/. `type` is the card type's key — the
// same string the SPA uses for its route and its layer.
export interface MapCardFeature {
  id: string
  type: string
  title: string
  points: MapPoint[]
  route: MapPoint[]
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
