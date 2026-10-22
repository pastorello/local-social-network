import type { MapPoint } from '@/definitions/interfaces/Content'

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
