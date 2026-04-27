import type Comment from './Comment'
import type Like from './Like'
import type PostAttachment from './PostAttachment'
import type User from './User'

export default interface Post {
  id: string
  body: string
  attachments: PostAttachment[]
  is_private: boolean
  likes: Like[]
  likes_count: number
  comments: Comment[]
  comments_count: number
  reported_by_users: User[]
  created_at: string
  created_at_formatted: string
  created_by: User
}
