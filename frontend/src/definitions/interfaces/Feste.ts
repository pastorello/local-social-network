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

export default interface Feste {
  id: string
  title: string
  body_html: string
  author: User
  is_published: boolean
  recurrence: string
  programme: string
  images: CardImage[]
  route: RoutePoint[]
  pins: RoutePoint[]
  created_at: string
  updated_at: string
}
