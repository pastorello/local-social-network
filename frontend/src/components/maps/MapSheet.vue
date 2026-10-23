<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

import { useMapStore } from '@/stores/map'

// The mobile home's sheet (spec/design.md D3): the map fills the screen and
// this sits over it, already open with content in it. Dragged up it is a list
// you read; pushed down it is a map you explore. Neither mode asks the reader
// to guess where to tap.
//
// Height, not transform: the content has to scroll inside the sheet at every
// stop, and a transformed element still occupies its original box.
//
// The lowest stop is the handle's 44px and two lines of what the sheet opens
// on — on the home, the presentation (D3's note of 2026-10-23).
const SNAPS = [
  { key: 'peek', label: 'Mostra i luoghi', height: '6.25rem' },
  { key: 'half', label: 'Espandi l’elenco', height: '45vh' },
  { key: 'full', label: 'Riduci l’elenco', height: '85vh' },
] as const

// `title` names the sheet for assistive technology. It is not drawn: the
// sheet opens on what the caller puts first (review of 2026-10-22, M-02 — on
// the home that is what the site is, not a count of what is on the map).
const props = defineProps<{ title: string; forcePeek?: boolean }>()

const snap = ref(1)
const dragHeight = ref<number | null>(null)

const height = computed(() =>
  dragHeight.value !== null ? `${dragHeight.value}px` : SNAPS[snap.value]!.height,
)
const isOpen = computed(() => snap.value > 0)

// A stop's height in pixels, for the drag and for the map.
const stopPixels = (index: number) => {
  const stop = SNAPS[index]!.height
  return stop.endsWith('vh') ? (parseFloat(stop) / 100) * window.innerHeight : parseFloat(stop) * 16
}

// The map frames Gaeta in the band above the sheet (review PR-5, M-01), so it
// is told the height of each stop the sheet comes to rest on — not of every
// step of a drag.
const mapStore = useMapStore()
watch(snap, (index) => mapStore.setSheetHeight(stopPixels(index)), { immediate: true })
onBeforeUnmount(() => mapStore.setSheetHeight(null))

// The first time in a session, a line under the handle says that it drags,
// until the reader drags it (review PR-15, M-11): a bar of 36 × 4px does not
// say so on its own. Storage can be missing or refuse — a private window,
// blocked site data — and then the line shows on every visit until the first
// drag; the sheet works the same either way.
const HINT_KEY = 'sheet.dragHintSeen'
const hintSeen = () => {
  try {
    return sessionStorage.getItem(HINT_KEY) === '1'
  } catch {
    return false
  }
}
const showHint = ref(!hintSeen())
if (showHint.value) {
  try {
    sessionStorage.setItem(HINT_KEY, '1')
  } catch {
    // Nothing to remember it in: the hint goes at the first drag all the same.
  }
}

// What pressing the handle does now, read after its name (which says it drags).
const actionId = useId()

// A press that moved further than this is a drag, not a tap.
const DRAG_SLOP = 6
let dragged = false

// The drag is the fast path and has no keyboard equivalent, so the handle is
// a real button that cycles the stops — same pattern as the manual lat/lng
// fallback next to every map editor in this codebase (WCAG 2.1.1). A drag
// ends on a click as well, and has already chosen its stop: that click is not
// a press.
const cycle = () => {
  if (dragged) {
    dragged = false
    return
  }
  snap.value = (snap.value + 1) % SNAPS.length
}

const collapse = () => {
  snap.value = 0
}

// Something else has taken the screen — the layer panel, on a phone. Get out
// of its way rather than letting the two overlap and clip each other.
watch(
  () => props.forcePeek,
  (peek) => {
    if (peek) snap.value = 0
  },
)

let startY = 0
let startHeight = 0

const onPointerDown = (event: PointerEvent) => {
  dragged = false
  startY = event.clientY
  startHeight = (event.currentTarget as HTMLElement).parentElement?.offsetHeight ?? 0
  dragHeight.value = startHeight
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (dragHeight.value === null) return
  if (Math.abs(event.clientY - startY) > DRAG_SLOP) {
    dragged = true
    showHint.value = false
  }
  const next = startHeight - (event.clientY - startY)
  dragHeight.value = Math.min(Math.max(next, 64), window.innerHeight * 0.9)
}

const onPointerUp = () => {
  if (dragHeight.value === null) return

  // Snap to whichever stop the drag ended nearest, so the sheet never rests
  // at an arbitrary height.
  const pixels = SNAPS.map((_stop, index) => stopPixels(index))
  const dragged = dragHeight.value
  let nearest = 0
  pixels.forEach((value, index) => {
    if (Math.abs(value - dragged) < Math.abs(pixels[nearest]! - dragged)) nearest = index
  })

  snap.value = nearest
  dragHeight.value = null
}

// A cancelled drag — the browser took the gesture — is followed by no click.
const onPointerCancel = () => {
  onPointerUp()
  dragged = false
}
</script>

<template>
  <section
    class="absolute inset-x-0 bottom-0 z-500 flex flex-col rounded-t-2xl bg-page shadow-[0_-8px_24px_-12px_rgba(31,41,51,0.45)] motion-safe:transition-[height] motion-safe:duration-200"
    :style="{ height }"
    :aria-label="props.title"
    @keydown.esc="collapse"
  >
    <!-- 44px tall and the sheet's whole width to grab (review PR-15, M-11),
    with the bar drawn as it was: the target grew, not the mark. `touch-none`
    keeps a phone's browser from taking the drag as a scroll of the page, or
    as a pull to refresh it. -->
    <button
      type="button"
      class="flex h-11 w-full flex-none touch-none items-center justify-center rounded-t-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sea"
      aria-label="Trascina per vedere più mappa"
      :aria-describedby="actionId"
      :aria-expanded="isOpen"
      @click="cycle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <span class="h-1 w-9 rounded-full bg-field/50" aria-hidden="true"></span>
      <span :id="actionId" class="sr-only">{{ SNAPS[snap]!.label }}</span>
    </button>
    <!-- Not at the lowest stop, where the sheet shows its first line and
    nothing else (D3's note of 2026-10-23), and hidden from assistive
    technology, which has the handle's name for it. -->
    <p
      v-if="showHint && snap > 0"
      class="flex-none pb-2 text-center text-xs text-muted"
      aria-hidden="true"
    >
      Trascina per vedere più mappa
    </p>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
      <slot></slot>
    </div>
  </section>
</template>
