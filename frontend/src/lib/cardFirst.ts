import axios from 'axios'
import type { NavigationGuardWithThis } from 'vue-router'

import { fetchEnglishOf } from '@/lib/readerCard'

// A card of a type with a place is fetched before its page mounts (review
// PR-10, spec/design.md D17's note of 2026-10-23): the card, not its type,
// says whether it opens narrow beside the map or wide over it, and the panel
// is born in that shape rather than changing it in front of the reader. Until
// the card is in, the page the reader came from stays on screen.
//
// The card rides on the navigation, in `meta.card` — this navigation's own
// copy of the route's meta, never the route's. A page that finds nothing there
// (the request failed) asks again itself, and says what went wrong.
//
// For a reader in English its English version comes with it, in
// `meta.translation` (review PR-19b, lib/readerCard.ts): shown at the
// original's address from the first frame, never after the Italian.
export const fetchCardFirst =
  (endpoint: string): NavigationGuardWithThis<undefined> =>
  async (to) => {
    try {
      const card = (await axios.get(`${endpoint}${to.params.id}/`)).data
      to.meta.card = card
      to.meta.translation = await fetchEnglishOf(endpoint, card)
    } catch {
      // Left to the page.
    }
  }
