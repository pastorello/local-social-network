import type User from './User'

export default interface Comment {
  id: string
  body: string
  created_by: User
  created_at: string
  created_at_formatted: string
}
