import type User from './User'

// Shared by every content type (feste included, though Feste.ts keeps its
// own literal copy since it predates this file and isn't worth touching).
export interface MapPoint {
  // A stored pin's id, sent back on save so the pin keeps its row and a tour
  // stop on it stays on it (TD-50). Absent on a point added in this edit, and
  // on a festa's route, whose points nothing names.
  id?: number
  lat: number
  lng: number
  label: string
}

// An editorial zone a place is in (spec cosa-fare.md Part −1, D2), named — on
// chiese and luoghi, for «Dove si trova» (review PR-3). By the pin, never by
// choice; empty outside every zone.
export interface ZoneRef {
  slug: string
  name: string
}

// GET /api/content/counts/ (review PR-9): the published originals of each
// type, keyed by its route segment — `luoghi`, `feste`, … `itinerari`.
export type CardCounts = Record<string, number>

export interface CardImage {
  id: string
  imageURL: string
  position: number
  caption: string
}

// One entry of a card's `translations` list (spec translations.md T1) — the
// other language versions a reader's language switch or a collaborator's
// "traduci" control can link to. Draft translations only appear here for
// their own author/an admin; everyone else sees published ones only (the
// API enforces this, not the frontend).
export interface TranslationRef {
  id: string
  language: string
  title: string
  is_published: boolean
}

export interface CardBase {
  id: string
  title: string
  // The card group's name: the original's title, the same string on a
  // translation as on its original (2026-09-09). A translated card shows this
  // as its heading and its own `title` underneath — the signs in Gaeta are in
  // Italian, so the Italian name is the identity and the translation a gloss.
  original_title: string
  body_html: string
  author: User
  is_published: boolean
  images: CardImage[]
  language: string
  translation_of: string | null
  translations: TranslationRef[]
  created_at: string
  updated_at: string
}

// Loosely typed on purpose: TypeForm.vue/TypeListView.vue/etc. are
// config-driven and work across chiese/ricette/personaggi/dialetto, whose
// extra fields differ per type (see definitions/typeConfigs.ts).
// What is known about getting into a place (ADR-0008), on chiese and luoghi —
// mirrors content/serializers.py::availability_of. A card nobody has filled in
// reads exactly like this with `state: 'unknown'` and empty strings: there is
// no "open" anywhere in it, by design.
export type AvailabilityState = 'unknown' | 'services' | 'on_request' | 'works' | 'no_door'

export interface Availability {
  state: AvailabilityState
  hours: string
  // ISO date the server set when `hours` last changed; null with no hours.
  hours_updated: string | null
  keeper: string
  keeper_phone: string
}

export type ContentItem = CardBase & Record<string, unknown>
