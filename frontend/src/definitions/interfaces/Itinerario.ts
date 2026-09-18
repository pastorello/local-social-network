import type { CardBase, MapPoint } from './Content'

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
  note: string
}

export default interface Itinerario extends CardBase {
  form: 'raccolta' | 'percorso'
  duration: string
  intents: string[]
  intent_labels: string[]
  stops: ItineraryStop[]
  // The walked path between the stops (I8); empty for a raccolta.
  route: MapPoint[]
}
