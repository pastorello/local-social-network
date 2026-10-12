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
export type ContentItem = CardBase & Record<string, unknown>
