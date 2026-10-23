import { computed, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useMapStore, type PanelShape } from '@/stores/map'

// D17's two shapes are the card's to decide, not its type's (review PR-10,
// spec/design.md D17's note of 2026-10-23). A route still names a shape —
// 'narrow' for the types that have a place — but that is the type's default:
// a ricetta sold nowhere, a personaggio with nothing of theirs on the map, a
// luogo still a draft without its pin have no place to show, and they open
// like a book, wide over a veiled map, with no strip of map on a phone. The
// page says so here; the shell — App.vue's panel, MapStage's veil and
// framing — draws what it says.

// The rule, one for every card: narrow beside the map when it has a place,
// wide over it when it has none — and the editor while its form is open, place
// or not: the form draws the place on that map (D19), and a card is written in
// one shape whatever its type (review PR-13).
export const cardPanelShape = (hasPlace: boolean, editing: boolean): PanelShape =>
  editing ? 'editor' : hasPlace ? 'narrow' : 'wide'

// Which page spoke last. Cleared only by that page, as usePanelTrail's trail
// is: the next one may already have said its own.
let speaker: symbol | null = null

// The page's side: the shape its data asks for, or null to leave the route's.
export const usePanelShape = (source: () => PanelShape | null) => {
  const mapStore = useMapStore()
  const me = Symbol('panel-shape')
  watch(
    source,
    (shape) => {
      speaker = me
      mapStore.setPanelShape(shape)
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    if (speaker !== me) return
    speaker = null
    mapStore.setPanelShape(null)
  })
}

// The shell's side: the shape the open page is drawn in — what its card said,
// or else its route's.
export const useOpenPanelShape = () => {
  const route = useRoute()
  const mapStore = useMapStore()
  return computed<PanelShape>(() => mapStore.panelShape ?? route.meta.panel ?? 'wide')
}
