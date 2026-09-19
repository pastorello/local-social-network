import type { MapPoint } from '@/definitions/interfaces/Content'

// "Come arrivarci" for one leg of a tour (spec itinerari.md I7): a plain Google
// Maps link built from our own coordinates, on foot. A link, not an embed —
// nothing of Google's is loaded on our page (TD-30, D6b); Google computes the
// walk when the guest opens it. Without a previous stop the leg starts from
// wherever the guest is, which is Google's default when no origin is given.
// `walking` for a percorso's legs; `null` leaves the mode to Google — a
// raccolta's *Portami* may be a beach reached by car or bus.
export const legDirections = (
  from: MapPoint | null,
  to: MapPoint,
  mode: 'walking' | null = 'walking',
): string => {
  const params = new URLSearchParams({ api: '1' })
  if (from) params.set('origin', `${from.lat},${from.lng}`)
  params.set('destination', `${to.lat},${to.lng}`)
  if (mode) params.set('travelmode', mode)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

// A stop being edited (spec itinerari.md I8) — StopsField's model.
export interface StopDraft {
  card: string
  type: string | null
  title: string
  point_index: number | null
  // The card's own pins and route, for choosing "which bakery" and for drawing
  // the stop where it is. Empty for a stop whose card is not on the public map
  // (a draft): it keeps the point it was saved with.
  points: MapPoint[]
  route: MapPoint[]
  savedPoint: MapPoint | null
  note: string
}

// Where a stop being edited is: its chosen pin, else its first, else the start
// of a festa's route, else the point it was saved with.
export const pointOf = (stop: StopDraft): MapPoint | null =>
  stop.points[stop.point_index ?? 0] ?? stop.route[0] ?? stop.savedPoint
