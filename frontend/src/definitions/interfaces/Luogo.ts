import type { Availability, CardBase, MapPoint, ZoneRef } from './Content'

// One of the admin-managed genres (spec content.md, luoghi) — mirrors
// luoghi/serializers.py::GenreSerializer.
export interface Genre {
  slug: string
  name: string
  name_plural: string
  // Published places carrying it, so an empty heading can be left out.
  count: number
}

export default interface Luogo extends CardBase {
  // The genre's slug, and its label for display. A translation shows its
  // original's, as it shows its original's pin.
  genre: string
  genre_label: string
  how_to_get_there: string
  pins: MapPoint[]
  // The zone its pin is in — the original's, for a translation (T5).
  zones: ZoneRef[]
  // The original's, in every language (ADR-0008, T5).
  availability: Availability
}
