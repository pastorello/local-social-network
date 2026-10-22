// How the one map frames what it is shown (review of 2026-10-22, PR-5: L-05,
// M-01, A-07): one rule for every caller — the open card and the tour
// (design.md D16), the set «Cosa si può fare qui» lists (cosa-fare.md D5), a
// form's draft (D19), and Gaeta itself, which is what the map frames when no
// page asks for anything. No Leaflet here on purpose: MapStage, which works out
// the free space, is on the entry path (TD-52); GaetaMap hands the result to
// Leaflet's `fitBounds`.

export interface Coords {
  lat: number
  lng: number
}

// The part of the map the reader can see, as how far in from the map's
// top-left and bottom-right corners it starts: what the menu, a panel, the
// phone's strip or the home's sheet leave free. In pixels, [x, y].
export interface FreeSpace {
  topLeft: [number, number]
  bottomRight: [number, number]
}

export interface Frame {
  bounds: [[number, number], [number, number]]
  options: {
    paddingTopLeft: [number, number]
    paddingBottomRight: [number, number]
    maxZoom: number
  }
}

// Never closer than this. A single place lands on it exactly — closer, its pin
// sits on a field with no street to know it by (L-05, M-04) — and two places
// next door are the same field, so a set or a route is held to it too
// (cosa-fare.md D5's note of 2026-10-23).
export const FRAME_MAX_ZOOM = 16

// Gaeta, from the Flacca's beaches at Sant'Agostino to Monte Orlando and the
// point of the medieval quarter: the city spec F2.1 configures, as a box rather
// than a centre and a zoom, so that it can be fitted into whatever the panel or
// the sheet leaves free.
export const GAETA_BOUNDS: Coords[] = [
  { lat: 41.2035, lng: 13.4935 },
  { lat: 41.2345, lng: 13.592 },
]

// A margin all round, for a page that leaves the whole map free.
const ANYWHERE: FreeSpace = { topLeft: [48, 48], bottomRight: [48, 48] }

// Below this the free space is a sliver — the phone's sheet pulled all the way
// up — and fitting anything into it would throw the map out to the whole
// region. Then the map is better left where it is.
const MIN_FREE = 96

// Where to put `points` so that they sit inside `free`: their box, at most
// FRAME_MAX_ZOOM. Null when there is nothing to frame, or — given the map's
// size — no room to frame it in.
export function frameInFreeSpace(
  points: Coords[],
  free: FreeSpace = ANYWHERE,
  size?: { x: number; y: number },
): Frame | null {
  if (points.length === 0) return null
  if (size) {
    const width = size.x - free.topLeft[0] - free.bottomRight[0]
    const height = size.y - free.topLeft[1] - free.bottomRight[1]
    if (width < MIN_FREE || height < MIN_FREE) return null
  }

  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)
  return {
    bounds: [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ],
    options: {
      paddingTopLeft: free.topLeft,
      paddingBottomRight: free.bottomRight,
      maxZoom: FRAME_MAX_ZOOM,
    },
  }
}
