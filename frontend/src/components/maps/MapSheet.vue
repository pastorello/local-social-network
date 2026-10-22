<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'

// The mobile home's sheet (spec/design.md D3): the map fills the screen and
// this sits over it, already open with content in it. Dragged up it is a list
// you read; pushed down it is a map you explore. Neither mode asks the reader
// to guess where to tap.
//
// Height, not transform: the content has to scroll inside the sheet at every
// stop, and a transformed element still occupies its original box.
const SNAPS = [
  { key: 'peek', label: 'Mostra i luoghi', height: '5.5rem' },
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

// The map keeps its OpenStreetMap credit just above the sheet's edge
// (MapStage), so the sheet says how tall it is — as the same length it is
// drawn with, so nothing has to be measured.
watchEffect(() => document.documentElement.style.setProperty('--sheet-h', height.value))
onBeforeUnmount(() => document.documentElement.style.removeProperty('--sheet-h'))

// The drag is the fast path and has no keyboard equivalent, so the handle is
// a real button that cycles the stops — same pattern as the manual lat/lng
// fallback next to every map editor in this codebase (WCAG 2.1.1).
const cycle = () => {
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
  startY = event.clientY
  startHeight = (event.currentTarget as HTMLElement).parentElement?.offsetHeight ?? 0
  dragHeight.value = startHeight
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (dragHeight.value === null) return
  const next = startHeight - (event.clientY - startY)
  dragHeight.value = Math.min(Math.max(next, 64), window.innerHeight * 0.9)
}

const onPointerUp = () => {
  if (dragHeight.value === null) return

  // Snap to whichever stop the drag ended nearest, so the sheet never rests
  // at an arbitrary height.
  const viewport = window.innerHeight
  const pixels = SNAPS.map((stop) =>
    stop.height.endsWith('vh')
      ? (parseFloat(stop.height) / 100) * viewport
      : parseFloat(stop.height) * 16,
  )
  const dragged = dragHeight.value
  let nearest = 0
  pixels.forEach((value, index) => {
    if (Math.abs(value - dragged) < Math.abs(pixels[nearest]! - dragged)) nearest = index
  })

  snap.value = nearest
  dragHeight.value = null
}
</script>

<template>
  <section
    class="absolute inset-x-0 bottom-0 z-500 flex flex-col rounded-t-2xl bg-page shadow-[0_-8px_24px_-12px_rgba(31,41,51,0.45)] motion-safe:transition-[height] motion-safe:duration-200"
    :style="{ height }"
    :aria-label="props.title"
    @keydown.esc="collapse"
  >
    <button
      type="button"
      class="flex h-8 w-full flex-none items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      :aria-expanded="isOpen"
      @click="cycle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <span class="h-1 w-9 rounded-full bg-field/50" aria-hidden="true"></span>
      <span class="sr-only">{{ SNAPS[snap]!.label }}</span>
    </button>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
      <slot></slot>
    </div>
  </section>
</template>
