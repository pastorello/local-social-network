<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import GaetaMap from '@/components/maps/GaetaMap.vue'
import { useIsDesktop } from '@/composables/useBreakpoint'
import { layerRoute } from '@/lib/mapLayers'
import { useMapStore } from '@/stores/map'
import { useUserStore } from '@/stores/user'

// The map under every page (spec/design.md D13): mounted once by the shell,
// so it is not rebuilt — and does not lose the reader's view — when a page
// opens over it. It draws what stores/map.ts holds; pages change the map only
// through the store.
const mapStore = useMapStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const { isDesktop } = useIsDesktop()

// Must match RoutePanel's narrow panel and HomeView's floating column, so a
// focused place is framed where the reader can actually see it (D16).
const NARROW_PANEL = 560
const HOME_COLUMN = 416
const GAP = 48

const focusPadding = computed<{ topLeft: [number, number]; bottomRight: [number, number] }>(() => {
  if (isDesktop.value && route.meta.panel === 'narrow') {
    return { topLeft: [GAP, GAP], bottomRight: [NARROW_PANEL + 16 + GAP, GAP] }
  }
  if (isDesktop.value && route.meta.fullBleed) {
    return { topLeft: [HOME_COLUMN + 16 + GAP, GAP], bottomRight: [GAP, GAP] }
  }
  return { topLeft: [GAP, GAP], bottomRight: [GAP, GAP] }
})

// Out of reach while a page covers it — a wide panel veils it, and on a phone
// every panel is the whole screen. `inert` rather than only hidden from view:
// a map the reader cannot see must not be a stop in their tab order.
const covered = computed(
  () =>
    route.name !== undefined &&
    !route.meta.fullBleed &&
    (!isDesktop.value || route.meta.panel !== 'narrow'),
)

const onPinClick = (id: string) => router.push(`/reports/${id}`)
const onFeatureClick = (feature: { type: string; id: string }) =>
  router.push(layerRoute(feature.type, feature.id))
const onMapClick = (coords: { lat: number; lng: number }) => {
  mapStore.draftCoords = coords
}

// Logging in or out changes which overlays exist for this reader.
watch(() => userStore.user.isAuthenticated, mapStore.fetchOverlays)

onMounted(mapStore.load)
</script>

<template>
  <div class="fixed inset-x-0 top-[var(--header-h,10rem)] bottom-0 z-0" :inert="covered">
    <GaetaMap
      :pins="mapStore.visiblePins"
      :features="mapStore.visibleFeatures"
      :overlays="mapStore.visibleOverlays"
      :placing="mapStore.placing"
      :focus="mapStore.focus"
      :focus-padding="focusPadding"
      @map-click="onMapClick"
      @pin-click="onPinClick"
      @feature-click="onFeatureClick"
    />
  </div>
</template>
