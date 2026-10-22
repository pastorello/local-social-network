import type { RouteLocationRaw } from 'vue-router'

import type { MapPoint, ZoneRef } from '@/definitions/interfaces/Content'
import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { Coords } from '@/lib/mapFrame'

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

// Stops that stand on one spot share one marker on the map, carrying every
// number that stands there — "1 · 2" — instead of two labels drawn one over
// the other, where only the top one can be read (review PR-7, L-07). One spot
// is the same point to a metre: two cards on one square, or a church and the
// procession that sets off from its door.
export const stopsByPlace = <P extends Coords>(points: P[]): { point: P; numbers: number[] }[] => {
  const places = new Map<string, { point: P; numbers: number[] }>()
  points.forEach((point, index) => {
    const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`
    const place = places.get(key)
    if (place) place.numbers.push(index + 1)
    else places.set(key, { point, numbers: [index + 1] })
  })
  return [...places.values()]
}

// What a percorso offers once its last stop is reached (review PR-7, the
// after-tour decided on 2026-10-22): another tour, what is around the last
// stop, and something to eat. Each only when something is behind it — the
// rule lib/doors.ts keeps for the ways in: no door onto an empty room.
export interface AfterTourLink {
  label: string
  detail: string
  to: RouteLocationRaw
}

export const afterTour = ({
  intents,
  isPublished,
  intentCounts,
  tours,
  zone,
  ricette,
}: {
  // The tour's own intents, in its order, and whether it is itself among the
  // published tours the counts include.
  intents: string[]
  isPublished: boolean
  // The admin-managed intents, each with its count of published tours.
  intentCounts: Intent[]
  // Published tours, and published ricette, in all.
  tours: number
  zone: ZoneRef | null
  ricette: number
}): AfterTourLink[] => {
  const others = (count: number) => count - (isPublished ? 1 : 0)
  const links: AfterTourLink[] = []
  // Another tour for the same wish, else any other tour.
  const sameWish = intents
    .map((slug) => intentCounts.find((intent) => intent.slug === slug))
    .find((intent) => intent && others(intent.count) > 0)
  if (sameWish) {
    links.push({
      label: 'Un altro itinerario',
      detail: sameWish.name,
      to: { path: '/itinerari', query: { intento: sameWish.slug } },
    })
  } else if (others(tours) > 0) {
    links.push({ label: 'Un altro itinerario', detail: 'Tutti gli itinerari', to: '/itinerari' })
  }
  if (zone) {
    links.push({
      label: 'Cosa c’è qui intorno',
      detail: zone.name,
      to: { path: '/cosa-fare', query: { zona: zone.slug } },
    })
  }
  if (ricette > 0) {
    links.push({ label: 'Da mangiare', detail: 'Le ricette di Gaeta', to: '/ricette' })
  }
  return links
}
