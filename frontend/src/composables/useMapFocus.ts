import { onBeforeUnmount, watch } from 'vue'

import { useMapStore, type MapFocus } from '@/stores/map'

// The map reacts to what is open (spec/design.md D16): a page with a place
// hands the map that place for as long as the page is open, and takes it back
// when it closes — the map then returns the reader to where they were.
export function useMapFocus(getFocus: () => MapFocus | null) {
  const mapStore = useMapStore()

  watch(getFocus, (focus) => mapStore.setFocus(focus), { immediate: true, deep: true })
  onBeforeUnmount(() => mapStore.setFocus(null))
}
