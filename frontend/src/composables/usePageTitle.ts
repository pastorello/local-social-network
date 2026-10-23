import { watch } from 'vue'
import { useRoute } from 'vue-router'

import { setTitle } from '@/lib/pageTitle'

// A page whose title is its data (lib/pageTitle.ts): `source` gives the parts
// once the data is in, or null while it is not — the route's own title stands
// meanwhile. Applied again after every navigation within the page (a stop of
// a tour, `?mappa=1`), since the router puts the route's title back each time.
// After the render, so a page that is being left — and whose data may still
// answer the old question — is gone before it could write over the next one.
export const usePageTitle = (source: () => readonly string[] | null) => {
  const route = useRoute()
  watch(
    [source, () => route.fullPath],
    ([parts]) => {
      if (parts) setTitle(parts)
    },
    { immediate: true, flush: 'post' },
  )
}
