import type { MapPoint } from '@/definitions/interfaces/Content'

type Place = Pick<MapPoint, 'lat' | 'lng'>

// "Come arrivarci": a plain Google Maps link built from our own coordinates —
// a card's place (review PR-3) or one leg of a tour (spec itinerari.md I7). A
// link, not an embed: nothing of Google's is loaded on our page (TD-30, D6b);
// Google computes the way when the reader opens it. Without `from` the way
// starts from wherever the reader is, which is Google's default when no origin
// is given. On foot unless told otherwise; `mode: null` leaves it to Google —
// a raccolta's *Portami* may be a beach reached by car or bus.
export const directionsUrl = (
  to: Place,
  { from = null, mode = 'walking' }: { from?: Place | null; mode?: 'walking' | null } = {},
): string => {
  const params = new URLSearchParams({ api: '1' })
  if (from) params.set('origin', `${from.lat},${from.lng}`)
  params.set('destination', `${to.lat},${to.lng}`)
  if (mode) params.set('travelmode', mode)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
