import axios from 'axios'
import { defineStore } from 'pinia'

import type Category from '@/definitions/interfaces/Category'
import type { MapPoint } from '@/definitions/interfaces/Content'
import type { MapCardFeature, Overlay } from '@/definitions/interfaces/MapData'
import type { ReportPin } from '@/definitions/interfaces/Report'
import { CARD_LAYERS, REPORTS_LAYER_KEY } from '@/lib/mapLayers'

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
}

export const useMapStore = defineStore('map', {
  state: () => ({
    categories: [] as Category[],
    pins: [] as ReportPin[],
    features: [] as MapCardFeature[],
    overlays: [] as Overlay[],
    // Spec map.md M1/M2: every layer is the reader's to toggle, all on by
    // default — the first thing a visitor should see is how much of the city
    // is on the map.
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
    loaded: false,
  }),

  getters: {
    visibleFeatures: (state) =>
      state.features.filter((feature) => state.activeLayers[feature.type]),
    visiblePins: (state) => (state.activeLayers[REPORTS_LAYER_KEY] ? state.pins : []),
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

    // Once per session: the map is not re-fetched because a page opened over
    // it. A card saved or a report filed refetches what it changed.
    async load() {
      if (this.loaded) return
      this.loaded = true
      await Promise.all([
        this.fetchCategories(),
        this.fetchPins(),
        this.fetchFeatures(),
        this.fetchOverlays(),
      ])
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
  },
})
