import axios from 'axios'
import { defineStore } from 'pinia'

import type Category from '@/definitions/interfaces/Category'
import type { MapPoint } from '@/definitions/interfaces/Content'
import type { MapCardFeature, Overlay } from '@/definitions/interfaces/MapData'
import type { ReportPin } from '@/definitions/interfaces/Report'
import { CARD_LAYERS, REPORTS_LAYER_KEY } from '@/lib/mapLayers'
import { useUserStore } from '@/stores/user'

// The map under every page (spec/design.md D13): one map, mounted by the shell,
// and every route renders over it. What it shows used to be HomeView's own
// state; it lives here now because the map outlives any one page — the layers a
// reader turned off on the home are still off when they open a card and come
// back, and a card can tell the map what to look at (D16) without owning it.

// What the map should look at while a page is open (D16): the card's own
// geometry, so a draft — which is not among the published features — can be
// shown too. `id` is what the published features are dimmed against.
export interface MapFocus {
  id: string
  type: string
  points: MapPoint[]
  route: MapPoint[]
  // A report is not a card type: it brings its status colour instead.
  color?: string
  // A tour's stops are numbered on the map (spec itinerari.md I11).
  numbered?: boolean
}

// The map as the collaborator's editor (spec/design.md D19): a form that is
// drawing hands the map the points it owns, and the map reports clicks back.
// The form owns the data — the map only draws the draft it is handed — so
// what is edited is always the form's, and cancelling the form cancels it.
export interface MapEditor {
  // A route is ordered and joined by a line; pins are an unordered, capped bag;
  // stops (an itinerary, spec itinerari.md I8) are cards picked by clicking
  // their pins — a click on empty map adds nothing.
  kind: 'route' | 'pins' | 'stops'
  points: MapPoint[]
  max: number
  // What the banner over the map says is being drawn.
  label: string
  // Stops of a percorso are joined in order; a raccolta's are not.
  joined?: boolean
}

// Handles, not data (the same reasoning as stores/toast.ts's timers): the
// callbacks of the one form that is drawing, kept out of reactive state.
let onEditorAdd: ((point: { lat: number; lng: number }) => void) | null = null
let onEditorDone: (() => void) | null = null
let onEditorPick: ((feature: { type: string; id: string }) => void) | null = null
// Who holds the editor now. Two fields can hand it over in the same flush —
// a form's *Il tragitto* tab closing while its *Tappe* tab opens — and the
// order their watchers run in is not the order that makes sense, so a field
// may only switch off the editor it started, never one another field has
// taken since.
let editorLease: symbol | null = null

export const useMapStore = defineStore('map', {
  state: () => ({
    categories: [] as Category[],
    pins: [] as ReportPin[],
    features: [] as MapCardFeature[],
    overlays: [] as Overlay[],
    // Spec map.md M1/M2: every layer is the reader's to toggle, all on by
    // default — the first thing a visitor should see is how much of the city
    // is on the map. The reports layer is on too, but only someone with an
    // account has one (decided 2026-10-22, reports-and-polls.md R1).
    activeLayers: Object.fromEntries([
      ...CARD_LAYERS.map((layer) => [layer.key, true]),
      [REPORTS_LAYER_KEY, true],
    ]) as Record<string, boolean>,
    activeOverlays: {} as Record<string, boolean>,
    overlayOpacity: {} as Record<string, number>,
    // The reports layer's own filters (v1).
    q: '',
    categoryFilter: '',
    statusFilter: '',
    // Filing a report: the map is in "place a point" mode, and the point the
    // reader chose — by click or typed in — is here.
    placing: false,
    draftCoords: null as { lat: number; lng: number } | null,
    focus: null as MapFocus | null,
    // The cards a page wants the map to show and nothing else — «Cosa si può
    // fare qui» draws exactly its list (cosa-fare.md D5). Unnumbered, unlike a
    // tour's focus, and separate from `activeLayers`, which are the reader's
    // toggles and must outlive the page.
    restrictTo: null as string[] | null,
    editor: null as MapEditor | null,
    loaded: false,
  }),

  getters: {
    visibleFeatures: (state) =>
      state.features.filter((feature) => state.activeLayers[feature.type]),
    // Whatever the store holds, a reader without an account is handed no
    // report: a fetch still in flight when they signed out cannot put one back.
    visiblePins: (state) =>
      useUserStore().user.isAuthenticated && state.activeLayers[REPORTS_LAYER_KEY]
        ? state.pins
        : [],
    visibleOverlays: (state) =>
      state.overlays
        .filter((overlay) => state.activeOverlays[overlay.id])
        .map((overlay) => ({
          ...overlay,
          opacity: state.overlayOpacity[overlay.id] ?? overlay.opacity,
        })),
  },

  actions: {
    featureCount(key: string) {
      return this.features.filter((feature) => feature.type === key).length
    },

    async fetchCategories() {
      try {
        this.categories = (await axios.get<Category[]>('/api/categories/')).data
      } catch (error) {
        console.log('error', error)
      }
    },

    async fetchPins() {
      const params: Record<string, string> = {}
      if (this.q) params.q = this.q
      if (this.categoryFilter) params.category = this.categoryFilter
      if (this.statusFilter) params.status = this.statusFilter
      try {
        this.pins = (await axios.get<ReportPin[]>('/api/reports/map/', { params })).data
      } catch (error) {
        console.log('error', error)
      }
    },

    async fetchFeatures() {
      try {
        this.features = (await axios.get<MapCardFeature[]>('/api/map/features/')).data
      } catch (error) {
        console.log('error', error)
      }
    },

    // What comes back depends on who is asking — the server decides (spec
    // politics.md). The SPA neither knows nor asks: it draws the list it is
    // given.
    async fetchOverlays() {
      try {
        this.overlays = (await axios.get<Overlay[]>('/api/map/overlays/')).data
        for (const overlay of this.overlays) {
          if (!(overlay.id in this.overlayOpacity))
            this.overlayOpacity[overlay.id] = overlay.opacity
        }
      } catch (error) {
        console.log('error', error)
      }
    },

    // Reports, and the categories they are filed under, are for people with
    // an account (decided 2026-10-22, reports-and-polls.md R1): the API
    // answers a reader with a 401, so a reader never asks, and signing out
    // forgets what was fetched — a filing under way included.
    async loadReports() {
      if (!useUserStore().user.isAuthenticated) {
        this.stopPlacing()
        this.pins = []
        this.categories = []
        return
      }
      await Promise.all([this.fetchCategories(), this.fetchPins()])
    },

    // Once per session: the map is not re-fetched because a page opened over
    // it. A card saved or a report filed refetches what it changed.
    async load() {
      if (this.loaded) return
      this.loaded = true
      await Promise.all([this.loadReports(), this.fetchFeatures(), this.fetchOverlays()])
    },

    startPlacing() {
      this.placing = true
      this.draftCoords = null
      this.activeLayers[REPORTS_LAYER_KEY] = true
    },

    stopPlacing() {
      this.placing = false
      this.draftCoords = null
    },

    setFocus(focus: MapFocus | null) {
      this.focus = focus
    },

    setRestriction(ids: string[] | null) {
      this.restrictTo = ids
    },

    startEditing(
      editor: MapEditor,
      onAdd: (point: { lat: number; lng: number }) => void,
      onDone: () => void,
      onPick: ((feature: { type: string; id: string }) => void) | null = null,
    ): symbol {
      this.editor = editor
      onEditorAdd = onAdd
      onEditorDone = onDone
      onEditorPick = onPick
      editorLease = Symbol('editor')
      return editorLease
    },

    updateEditorPoints(points: MapPoint[]) {
      if (this.editor) this.editor = { ...this.editor, points }
    },

    // With the lease `startEditing` returned, a no-op once someone else holds
    // the editor; without one, unconditional.
    stopEditing(lease?: symbol) {
      if (lease && lease !== editorLease) return
      editorLease = null
      this.editor = null
      onEditorAdd = null
      onEditorDone = null
      onEditorPick = null
    },

    // A card's pin clicked while an itinerary is picking its stops: the card
    // becomes the next stop instead of opening.
    editorPick(feature: { type: string; id: string }) {
      onEditorPick?.(feature)
    },

    // A click on the map while a form is drawing: the form decides what it
    // means (a new stop, a pin — or nothing, at capacity).
    editorAdd(point: { lat: number; lng: number }) {
      onEditorAdd?.(point)
    },

    // "Fatto" on the banner: the form leaves its drawing tab.
    editorDone() {
      onEditorDone?.()
    },
  },
})
