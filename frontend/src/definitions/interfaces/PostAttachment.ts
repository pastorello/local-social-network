import type User from './User'

export default interface PostAttachment {
  id: string
  attachmentURL: string
  created_by: User
}
