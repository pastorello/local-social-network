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

// The bottom-right corner holds Leaflet's attribution — the OpenStreetMap
// credit the tile policy requires to be visible — and on most layouts
// something of ours sits on that corner. It moves to where the map is still
// in view: left of the narrow panel; above "Allarga la mappa" in the phone's
// strip (D18) and above "Torna alla scheda" once that strip is enlarged; and
// on the phone's home, riding the sheet's edge (the sheet publishes its height
// as `--sheet-h`) but never higher than just below "Livelli" — with the sheet
// fully up the map is a sliver under the menu, and the credit goes behind the
// sheet with it rather than under the button. Behind a wide panel it stays
// where it is, veiled with the rest of the map.
const controlsRight = computed(() =>
  isDesktop.value && route.meta.panel === 'narrow' ? 'calc(36rem + 0.75rem)' : '0px',
)
const controlsBottom = computed(() => {
  if (isDesktop.value) return '0px'
  if (route.meta.fullBleed) {
    return 'min(var(--sheet-h, 0px), calc(100% - var(--header-h, 0px) - 4.5rem))'
  }
  if (route.meta.panel !== 'narrow') return '0px'
  // RoutePanel lays the strip out below the menu, hence the header's height.
  return route.query.mappa === '1' ? '4.25rem' : 'calc(100% - var(--header-h, 0px) - 8.25rem)'
})

// While a form draws on the map, nothing on it navigates: opening a pin would
// unmount the form and lose what it holds. The click still reaches the map,
// where the form decides what it means (D19).
// A tour is followed on its own (decided 2026-09-19): while one is open the
// map draws only its numbered stops and its path. Everything else was there,
// dimmed, and the clusters' counts read as more stop numbers beside the tour's.
const tourOpen = computed(() => !mapStore.editor && !!mapStore.focus?.numbered)

// A page that lists a set of cards (cosa-fare.md D5) has the map draw that
// set and nothing else — no other card, no report — while it is open.
const restricted = computed(() => !mapStore.editor && mapStore.restrictTo !== null)
const shownFeatures = computed(() => {
  if (tourOpen.value) return []
  if (!restricted.value) return mapStore.visibleFeatures
  const ids = new Set(mapStore.restrictTo)
  return mapStore.visibleFeatures.filter((feature) => ids.has(feature.id))
})

const onPinClick = (id: string) => {
  if (mapStore.editor) return
  router.push(`/reports/${id}`)
}
// While an itinerary picks its stops (spec itinerari.md I8), a card's pin
// becomes the next stop instead of opening the card.
const onFeatureClick = (feature: { type: string; id: string }) => {
  if (mapStore.editor?.kind === 'stops') {
    mapStore.editorPick(feature)
    return
  }
  if (mapStore.editor) return
  router.push(layerRoute(feature.type, feature.id))
}
const onMapClick = (coords: { lat: number; lng: number }) => {
  // A form drawing on the map takes the click (D19); otherwise it is a report
  // being placed.
  if (mapStore.editor) {
    mapStore.editorAdd(coords)
    return
  }
  mapStore.draftCoords = coords
}

// Logging in or out changes which overlays exist for this reader, and which
// drafts are on the map (spec map.md M5).
watch(
  () => userStore.user.isAuthenticated,
  () => Promise.all([mapStore.fetchOverlays(), mapStore.fetchFeatures()]),
)

onMounted(mapStore.load)
</script>

<template>
  <!-- Edge to edge, under the menu too (D14): the menu floats over the map. -->
  <div
    class="fixed inset-0 z-0"
    :inert="covered"
    :style="{
      '--map-controls-left': controlsLeft,
      '--map-controls-right': controlsRight,
      '--map-controls-bottom': controlsBottom,
    }"
  >
    <GaetaMap
      :pins="tourOpen || restricted ? [] : mapStore.visiblePins"
      :features="shownFeatures"
      :overlays="mapStore.visibleOverlays"
      :placing="mapStore.placing"
      :focus="mapStore.editor ? null : mapStore.focus"
      :editor="mapStore.editor"
      :focus-padding="focusPadding"
      @map-click="onMapClick"
      @pin-click="onPinClick"
      @feature-click="onFeatureClick"
    />
    <!-- D19: a map that sometimes takes clicks as edits and sometimes does not
    must never leave it ambiguous which it is doing now. -->
    <div
      v-if="mapStore.editor"
      role="status"
      class="absolute top-[calc(var(--header-h,0px)+0.5rem)] right-3 left-14 z-1000 flex items-center justify-between gap-3 rounded-full bg-ink py-1.5 pr-1.5 pl-4 text-sm font-semibold text-white shadow-md lg:top-auto lg:right-auto lg:bottom-4 lg:left-4"
    >
      <span>{{ mapStore.editor.label }}</span>
      <button
        type="button"
        class="h-9 cursor-pointer rounded-full bg-surface px-4 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        @click="mapStore.editorDone()"
      >
        Fatto
      </button>
    </div>
    <RouterLink
      v-if="offerList && !mapStore.editor"
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

div :deep(.leaflet-right) {
  right: var(--map-controls-right, 0px);
}

div :deep(.leaflet-bottom) {
  bottom: var(--map-controls-bottom, 0px);
}

/* The OpenStreetMap credit, in the app's colours rather than Leaflet's: an
   opaque surface, because Leaflet's 80% white lets a dark tile pull its blue
   link under 4.5:1 (ADR-0005), and the link underlined, so it is told apart
   from the text by more than its colour (1.4.1). */
div :deep(.leaflet-control-attribution) {
  background: var(--color-surface);
  color: var(--color-ink);
  border-top-left-radius: 0.375rem;
}

div :deep(.leaflet-control-attribution a) {
  color: var(--color-sea);
  text-decoration: underline;
  text-underline-offset: 2px;
}

div :deep(.leaflet-control-attribution a:focus-visible) {
  outline: 2px solid var(--color-sea);
  outline-offset: 2px;
}
</style>
