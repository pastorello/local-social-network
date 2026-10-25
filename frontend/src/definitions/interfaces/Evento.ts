import type { ZoneRef } from './Content'
import type User from './User'

// Events and the feasts' editions (spec cosa-fare.md Part −1 D9) — mirrors
// eventi/serializers.py. An event is not a card (CF25): no rich text, no
// gallery, no translations, never a layer of the map.

// CF28: «in programma», then postponed or called off — and a cancelled event
// stays cancelled.
export type EventState = 'in_programma' | 'rinviato' | 'annullato'

// Where it is held: a card of the archive that has a place, or one labelled
// point (CF31). `card` is null for the point.
export interface EventPlace {
  card: { id: string; type: string; title: string } | null
  label: string
  lat: number
  lng: number
}

export interface Evento {
  kind: 'evento'
  id: string
  title: string
  // A calendar day and an hour on a wall in Gaeta, never an instant (CF25).
  start_date: string
  start_time: string | null
  // The same as `start_date` for a one-day event.
  end_date: string
  description: string
  poster: string | null
  link: string
  // Null when its venue's card was deleted, or is a draft this reader may not
  // open.
  place: EventPlace | null
  zones: ZoneRef[]
  state: EventState
  is_published: boolean
  // Over in Gaeta's day (CF26): still readable at its address, no longer
  // proposed.
  is_over: boolean
  author: User
  created_at: string
  updated_at: string
}

// One year's date of a feast (K2), typed by hand — as the festa's own card
// and form read it.
export interface Edizione {
  id: number
  start_date: string
  end_date: string
  note: string
}

// A feast's edition in a list of what is on (`/api/eventi/`), beside events.
export interface EdizioneItem extends Edizione {
  kind: 'edizione'
  // The feast's card: its title, and its id for the link to it.
  title: string
  festa: string
  // The feast's card has a published English version (review PR-19b). An
  // event has no translation, and no such field.
  has_en?: boolean
}

export type EventItem = Evento | EdizioneItem
