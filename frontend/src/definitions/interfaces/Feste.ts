import type User from './User'

export interface RoutePoint {
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

// Kept as its own literal copy rather than importing Content.ts's
// TranslationRef — Feste.ts predates that file and isn't worth retrofitting
// (same call as the rest of this interface, see the C3 note in Content.ts).
export interface TranslationRef {
  id: string
  language: string
  title: string
  is_published: boolean
}

export default interface Feste {
  id: string
  title: string
  original_title: string
  body_html: string
  author: User
  is_published: boolean
  recurrence: string
  programme: string
  images: CardImage[]
  route: RoutePoint[]
  pins: RoutePoint[]
  language: string
  translation_of: string | null
  translations: TranslationRef[]
  created_at: string
  updated_at: string
}
