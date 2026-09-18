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
// The phone's strip above a card with a place (D18) — RoutePanel's 11.25rem.
const PHONE_STRIP = 180

// The map runs under the floating menu, so what it frames starts below it.
const menuBottom = () => {
  if (typeof window === 'undefined') return 0
  const value = getComputedStyle(document.documentElement).getPropertyValue('--header-h')
  return Number.parseFloat(value) || 0
}

const focusPadding = computed<{ topLeft: [number, number]; bottomRight: [number, number] }>(() => {
  const top = menuBottom() + GAP
  if (isDesktop.value && route.meta.panel === 'narrow') {
    return { topLeft: [GAP, top], bottomRight: [NARROW_PANEL + 16 + GAP, GAP] }
  }
  if (isDesktop.value && route.meta.fullBleed) {
    return { topLeft: [HOME_COLUMN + 16 + GAP, top], bottomRight: [GAP, GAP] }
  }
  if (!isDesktop.value && route.meta.panel === 'narrow') {
    // D18: framed inside the strip above the article — or, expanded, the
    // whole screen above the "Torna alla scheda" button.
    const phoneTop = menuBottom() + 16
    if (route.query.mappa === '1') return { topLeft: [16, phoneTop], bottomRight: [16, 80] }
    const below = window.innerHeight - (menuBottom() + PHONE_STRIP) + 16
    return { topLeft: [16, phoneTop], bottomRight: [16, below] }
  }
  return { topLeft: [GAP, top], bottomRight: [GAP, GAP] }
})

// Out of reach while a page covers it — a wide panel veils it, and on a phone
// every page but a card with a place is the whole screen. `inert` rather than
// only hidden from view: a map the reader cannot see must not be a stop in
// their tab order. A card with a place leaves the map in view — beside it on a
// wide screen, in the strip above it on a phone (D18).
const covered = computed(
  () => route.name !== undefined && !route.meta.fullBleed && route.meta.panel !== 'narrow',
)

// D20: the text lists are ADR-0005's equivalent of the pins, so they stay one
// tap away wherever the map is on screen. The home carries them; beside a
// narrow panel the map is on screen without them, so it offers the way back.
const offerList = computed(() => isDesktop.value && route.meta.panel === 'narrow')

// Leaflet's zoom buttons live in the map's top-left corner, which on the wide
// home is under the floating column: they move out beside it.
const controlsLeft = computed(() =>
  isDesktop.value && route.meta.fullBleed ? `${HOME_COLUMN + 16 + 16}px` : '0px',
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
  <!-- Edge to edge, under the menu too (D14): the menu floats over the map. -->
  <div class="fixed inset-0 z-0" :inert="covered" :style="{ '--map-controls-left': controlsLeft }">
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
    <RouterLink
      v-if="offerList"
      to="/"
      class="absolute bottom-4 left-4 z-1000 flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
    >
      <svg
        viewBox="0 0 20 20"
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M7.5 5.5h9M7.5 10h9M7.5 14.5h9M3.5 5.5h.5M3.5 10h.5M3.5 14.5h.5" />
      </svg>
      Elenco · {{ mapStore.visibleFeatures.length }} luoghi
    </RouterLink>
  </div>
</template>

<style scoped>
/* Leaflet's own controls (zoom) sit in its top corners, and the map now runs
   under the floating menu: they start below it instead of behind it. */
div :deep(.leaflet-top) {
  top: var(--header-h, 0px);
}

div :deep(.leaflet-left) {
  left: var(--map-controls-left, 0px);
}
</style>
