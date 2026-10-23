import {
  inject,
  onBeforeUnmount,
  provide,
  shallowRef,
  watch,
  type InjectionKey,
  type ShallowRef,
} from 'vue'
import type { RouteLocationRaw } from 'vue-router'

// The eyebrow at a panel's head (review PR-23, N-02; spec/design.md D14's
// note of 2026-10-23): where the reader is, one level up and what this page
// is within it — «Chiese · Gaeta Medievale», «Giro del centro · Tappa 3 di 7».
// The panel draws it and knows the level above from the route alone
// (lib/navigation.ts::parentOf); what only the page's data knows — the zones
// a card is in, a tour's intents, the name of the tour a stop belongs to — the
// page hands it here, as it hands the map what to frame (useMapFocus). A page
// that hands one over draws no eyebrow of its own over its title.
export interface TrailStep {
  label: string
  // A step is a link when it leads somewhere — a zone to «Cosa fare» — and
  // plain text when it is where the reader already is (a stop's position).
  to?: RouteLocationRaw
}

export interface Trail {
  // The level above by its own name, where the page has a better one than
  // the route's: a stop is under *its* tour, not under "Itinerario".
  up?: string
  steps: TrailStep[]
}

export const PANEL_TRAIL: InjectionKey<ShallowRef<Trail | null>> = Symbol('panel-trail')

// The panel's side: one trail per panel, which whatever page it holds fills.
export const providePanelTrail = (): ShallowRef<Trail | null> => {
  const trail = shallowRef<Trail | null>(null)
  provide(PANEL_TRAIL, trail)
  return trail
}

// The page's side: what to add, recomputed as its data arrives. Outside a
// panel — a unit test mounting the view alone — it does nothing.
export const usePanelTrail = (source: () => Trail | null) => {
  const trail = inject(PANEL_TRAIL, null)
  if (!trail) return
  let mine: Trail | null = null
  watch(
    source,
    (value) => {
      mine = value
      trail.value = value
    },
    { immediate: true },
  )
  // Cleared only if it is still this page's: the next page may already have
  // written its own.
  onBeforeUnmount(() => {
    if (trail.value === mine) trail.value = null
  })
}
