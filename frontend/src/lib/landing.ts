import axios from 'axios'

import type { MyCard } from '@/definitions/interfaces/Content'

// Where a collaborator lands after signing in when nothing asked for a page
// (review PR-13, C-02): their own cards while one of them is a draft — the
// work they came back to finish — and otherwise the map, like anyone. The list
// puts drafts first (content/api.py::my_cards), so its first row says whether
// there is one. If the list cannot be had, the map: signing in must not fail
// over where to go next.
export const MY_CARDS = '/le-mie-schede'

export const landingAfterLogin = async (): Promise<string> => {
  try {
    const { data } = await axios.get<{ results: MyCard[] }>('/api/content/mine/', {
      params: { page_size: 1 },
    })
    return data.results[0]?.is_published === false ? MY_CARDS : '/'
  } catch {
    return '/'
  }
}
