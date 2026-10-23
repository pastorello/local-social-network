import { onBeforeUnmount, watch } from 'vue'

import { useMapStore, type MapFocus } from '@/stores/map'

// The map reacts to what is open (spec/design.md D16): a page with a place
// hands the map that place for as long as the page is open, and lets go of it
// when it closes. Letting go moves nothing (review PR-22): the map stays on the
// place, with every card drawn again, rather than going back to where it stood
// before the page opened.
export function useMapFocus(getFocus: () => MapFocus | null) {
  const mapStore = useMapStore()

  watch(getFocus, (focus) => mapStore.setFocus(focus), { immediate: true, deep: true })
  onBeforeUnmount(() => mapStore.setFocus(null))
}
