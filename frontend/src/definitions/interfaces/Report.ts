import type Category from './Category'
import type User from './User'

export type ReportStatus = 'open' | 'acknowledged' | 'resolved' | 'rejected'

export default interface Report {
  id: string
  title: string
  description: string
  lat: number
  lng: number
  status: ReportStatus
  category: Category
  author: User
  photoURL: string | null
  upvotes_count: number
  upvoted_by_me: boolean
  created_at: string
  updated_at: string
}

export interface ReportPin {
  id: string
  title: string
  lat: number
  lng: number
  status: ReportStatus
  category_id: string
}
