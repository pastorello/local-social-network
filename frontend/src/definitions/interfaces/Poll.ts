import type User from './User'

// Mirrors polls/serializers.py: votes_count and total_votes are null while
// results are hidden (spec F3.3).
export interface PollOption {
  id: string
  text: string
  position: number
  votes_count: number | null
}

export default interface Poll {
  id: string
  question: string
  created_by: User
  closes_at: string | null
  is_closed: boolean
  created_at: string
  options: PollOption[]
  my_vote: string | null
  results_visible: boolean
  total_votes: number | null
}
