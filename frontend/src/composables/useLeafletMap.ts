import { onBeforeUnmount, ref } from 'vue'

// Default import on purpose, same reasoning as ReportsMap.vue: a namespace
// import can be snapshotted by the bundler before a plugin mutates leaflet's
// exports at runtime, losing the mutation in production builds (TD-02).
import L from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { keepMarkersOutOfTabOrder } from '@/lib/leafletKeyboard'

// vue-leaflet must build the map from THIS leaflet instance — see
// ReportsMap.vue's comment on `use-global-leaflet`.
;(globalThis as typeof globalThis & { L: typeof L }).L = L

// Gaeta (spec F2.1: configured city center) — shared default for every map.
export const GAETA_CENTER: [number, number] = [41.2172608, 13.5625165]

export function useLeafletMap() {
  const wrapper = ref<HTMLDivElement | null>(null)
  const zoom = ref(15)
  const center = ref<[number, number]>(GAETA_CENTER)

  let map: LeafletMap | null = null
  let resizeObserver: ResizeObserver | null = null

  const onReady = (leafletMap: LeafletMap) => {
    keepMarkersOutOfTabOrder()
    map = leafletMap

    // Same reasoning as ReportsMap.vue: the grid layout may not have settled
    // when Leaflet first measures its container.
    map.invalidateSize()
    if (wrapper.value) {
      resizeObserver = new ResizeObserver(() => map?.invalidateSize())
      resizeObserver.observe(wrapper.value)
    }
  }

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
  })

  return { wrapper, zoom, center, onReady, getMap: () => map }
}
