<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useIsDesktop, useIsWide } from '@/composables/useBreakpoint'
import { useOpenPanelShape } from '@/composables/usePanelShape'
import { afterFirstPaint } from '@/lib/firstPaint'
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
const { isWide } = useIsWide()

// A page beside the map rather than over it (D17): a card with a place. Its
// card says whether it has one, not its type (review PR-10) — a ricetta sold
// nowhere covers the map like a book. And a form, which draws on the map
// beside it (D19, review PR-13).
const panelShape = useOpenPanelShape()
const besideMap = computed(() => !route.meta.fullBleed && panelShape.value !== 'wide')

// TD-52: Leaflet, its cluster plugin and vue-leaflet are 58% of what the
// entry chunk used to hold, and no page's text needs them. So the map is its
// own chunk, fetched once the reader has something to read — see onMounted.
const GaetaMap = defineAsyncComponent(() => import('@/components/maps/GaetaMap.vue'))
const drawMap = ref(false)

// Must match RoutePanel's narrow and editor panels and HomeView's floating
// column, so a focused place is framed where the reader can actually see it
// (D16). The editor is the reading panel's 808px from 1280px (review PR-13).
const NARROW_PANEL = 560
const EDITOR_PANEL = 808
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

// How wide the panel beside the map is, on a wide screen.
const panelWidth = computed(() =>
  panelShape.value === 'editor' && isWide.value ? EDITOR_PANEL : NARROW_PANEL,
)

const focusPadding = computed<{ topLeft: [number, number]; bottomRight: [number, number] }>(() => {
  const top = menuBottom() + GAP
  if (isDesktop.value && besideMap.value) {
    return { topLeft: [GAP, top], bottomRight: [panelWidth.value + 16 + GAP, GAP] }
  }
  if (isDesktop.value && route.meta.fullBleed) {
    return { topLeft: [HOME_COLUMN + 16 + GAP, top], bottomRight: [GAP, GAP] }
  }
  if (!isDesktop.value && route.meta.fullBleed && mapStore.sheetHeight !== null) {
    // The phone's home (review PR-5, M-01): the band between the menu and the
    // sheet, at the stop it rests on — the half of the screen the sheet does
    // not cover, where Gaeta has to fit.
    return { topLeft: [16, menuBottom() + 16], bottomRight: [16, mapStore.sheetHeight + 16] }
  }
  if (!isDesktop.value && besideMap.value) {
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
  () => route.name !== undefined && !route.meta.fullBleed && !besideMap.value,
)

// D20: the text lists are ADR-0005's equivalent of the pins, so they stay one
// tap away wherever the map is on screen. The home carries them; beside a
// narrow panel the map is on screen without them, so it offers the way back.
const offerList = computed(() => isDesktop.value && besideMap.value)

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
  isDesktop.value && besideMap.value ? `calc(${panelWidth.value + 16}px + 0.75rem)` : '0px',
)
const controlsBottom = computed(() => {
  if (isDesktop.value) return '0px'
  if (route.meta.fullBleed) {
    return 'min(var(--sheet-h, 0px), calc(100% - var(--header-h, 0px) - 4.5rem))'
  }
  if (!besideMap.value) return '0px'
  // RoutePanel lays the strip out below the menu, hence the header's height.
  return route.query.mappa === '1' ? '4.25rem' : 'calc(100% - var(--header-h, 0px) - 7.5rem)'
})

// The banner over a map a form is drawing on (D19) runs across the map right
// under the menu (review PR-13, A-05), so Leaflet's zoom buttons, which live
// there, step down below it. Measured, because the banner is one line on a
// wide screen and two or three on a phone.
const banner = ref<HTMLElement | null>(null)
const bannerBottom = ref(0)
let bannerObserver: ResizeObserver | null = null
watch(banner, (element) => {
  bannerObserver?.disconnect()
  bannerBottom.value = 0
  if (!element || typeof ResizeObserver !== 'function') return
  bannerObserver = new ResizeObserver(() => {
    bannerBottom.value = element.getBoundingClientRect().bottom
  })
  bannerObserver.observe(element)
})
onBeforeUnmount(() => bannerObserver?.disconnect())
const controlsTop = computed(() =>
  bannerBottom.value ? `${bannerBottom.value}px` : 'var(--header-h, 0px)',
)

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

// Logging in or out changes which overlays exist for this reader, which
// drafts are on the map (spec map.md M5), and whether there are reports at all
// (reports-and-polls.md R1, 2026-10-22).
watch(
  () => userStore.user.isAuthenticated,
  () => Promise.all([mapStore.fetchOverlays(), mapStore.fetchFeatures(), mapStore.loadReports()]),
)

onMounted(async () => {
  // The map's data does not wait for the map.
  const data = mapStore.load()
  // The words first: the page's own component, then a paint, then the map.
  await router.isReady()
  await afterFirstPaint()
  // A map under a page — hidden on a phone, veiled on a wide screen — must not
  // compete with that page for a slow network either: it waits until its own
  // data is in, or until the reader leaves for a page that shows it.
  if (covered.value) {
    const uncovered = new Promise((resolve) => watch(covered, resolve, { once: true }))
    await Promise.race([data, uncovered])
  }
  drawMap.value = true
})
</script>

<template>
  <!-- Edge to edge, under the menu too (D14): the menu floats over the map. -->
  <div
    class="fixed inset-0 z-0"
    :inert="covered"
    :style="{
      '--map-controls-top': controlsTop,
      '--map-controls-left': controlsLeft,
      '--map-controls-right': controlsRight,
      '--map-controls-bottom': controlsBottom,
    }"
  >
    <GaetaMap
      v-if="drawMap"
      :pins="tourOpen || restricted ? [] : mapStore.visiblePins"
      :features="shownFeatures"
      :overlays="mapStore.visibleOverlays"
      :placing="mapStore.placing"
      :focus="mapStore.editor ? null : mapStore.focus"
      :frame="mapStore.editor ? null : mapStore.frame"
      :editor="mapStore.editor"
      :focus-padding="focusPadding"
      @map-click="onMapClick"
      @pin-click="onPinClick"
      @feature-click="onFeatureClick"
      @view="mapStore.setView"
    />
    <!-- D19: a map that sometimes takes clicks as edits and sometimes does not
    must never leave it ambiguous which it is doing now — "a banner that cannot
    be missed". Across the map, right under the menu, in the accent (review
    PR-13, A-05): the first build's dark pill in the map's bottom-left corner
    was a status, not a banner. On a wide screen it runs to the panel, its top
    level with the panel's; on a phone, across the strip. -->
    <div
      v-if="mapStore.editor"
      ref="banner"
      role="status"
      class="absolute top-[var(--header-h,0px)] right-3 left-3 z-1000 flex items-center justify-between gap-3 rounded-xl bg-sea py-2 pr-2 pl-4 text-sm font-semibold text-white shadow-md lg:top-[calc(var(--header-h,0px)+1rem)] lg:right-[calc(var(--map-controls-right)+0.25rem)] lg:left-4"
    >
      <span>{{ mapStore.editor.label }}</span>
      <button
        type="button"
        class="h-9 flex-none cursor-pointer rounded-lg bg-surface px-4 text-sea focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
   under the floating menu: they start below it instead of behind it — and
   below the editing banner while there is one. */
div :deep(.leaflet-top) {
  top: var(--map-controls-top, var(--header-h, 0px));
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
