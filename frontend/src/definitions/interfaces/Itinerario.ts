import type { Availability, CardBase, CardImage, MapPoint, ZoneRef } from './Content'

// One stop of a tour (spec itinerari.md I3): a card of the archive, optionally
// one of its own points, and the tour author's note. Mirrors
// itinerari/serializers.py::ItinerarioReadSerializer.get_stops.
export interface ItineraryStop {
  card: string
  // The card's type key — its route and its layer (lib/mapLayers.ts).
  type: string | null
  title: string
  // False only for the tour's author or an admin: a reader never receives a
  // stop whose card has been unpublished since (I4).
  is_published: boolean
  point_index: number | null
  point: MapPoint | null
  // Every place the stop stands for: the chosen point, or all of the card's
  // pins when none was chosen (a dish and each bakery it is sold at).
  places: MapPoint[]
  // A luogo's own "come arrivarci"; empty for any other type.
  how_to_get_there: string
  note: string
  // What the guided mode shows of the stop itself (review PR-7): the card's
  // cover, the opening of its body as plain text (at most 400 characters), and
  // for a place with a door what is known about getting in — null for any
  // other type, `unknown` when nothing is (ADR-0008).
  cover: CardImage | null
  excerpt: string
  availability: Availability | null
  // The zones the stop's own point is in.
  zones: ZoneRef[]
}

// "Che cosa ti va di fare?" (I5): an intent, with the line under it.
export interface Intent {
  slug: string
  name: string
  name_plural: string
  // The English name, blank until the author writes it (review PR-19a).
  name_en?: string
  name_plural_en?: string
  description: string
  // The line in English (review PR-19b); blank, the Italian stands in.
  description_en?: string
  count: number
}

export default interface Itinerario extends CardBase {
  form: 'raccolta' | 'percorso'
  duration: string
  intents: string[]
  intent_labels: string[]
  // In the same order; each blank where the author has not written one.
  intent_labels_en?: string[]
  stops: ItineraryStop[]
  // The walked path between the stops (I8); empty for a raccolta.
  route: MapPoint[]
  // The editorial zones it belongs to (spec cosa-fare.md Part −1, D2): a
  // percorso where it starts, a raccolta wherever any published stop is.
  zones: string[]
}
