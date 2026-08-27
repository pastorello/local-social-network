import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'

import HomeView from '../HomeView.vue'
import { CARD_LAYERS } from '@/lib/mapLayers'

vi.mock('axios')

// GaetaMap mounts a real Leaflet map, which isn't viable under jsdom — same
// precedent as every other map component in this codebase (FesteRouteEditor,
// MapPinsEditor). The layer panel is what's under test here; what the map
// draws from the props it is handed is browser/Cypress territory.
const globalStubs = { GaetaMap: true }

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
      { path: '/chiese/:id', name: 'chiesedetail', component: stub },
      { path: '/feste/:id', name: 'festedetail', component: stub },
    ],
  })

const FEATURES = [
  {
    id: 'c1',
    type: 'chiese',
    title: 'Chiesa di Sant’Erasmo',
    points: [{ lat: 41.2, lng: 13.5, label: '' }],
    route: [],
  },
  {
    id: 'f1',
    type: 'feste',
    title: 'Processione di San Marciano',
    points: [],
    route: [{ lat: 41.2, lng: 13.5, label: '' }],
  },
]

const OVERLAYS = [
  {
    id: 'o1',
    name: 'Quartieri',
    kind: 'vector',
    position: 0,
    geojson: { type: 'FeatureCollection', features: [] },
    color: '#7c3aed',
    imageURL: null,
    bounds: null,
    opacity: 0.6,
  },
]

const mockApi = (overlays: unknown[] = OVERLAYS) => {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url === '/api/map/features/') return Promise.resolve({ data: FEATURES })
    if (url === '/api/map/overlays/') return Promise.resolve({ data: overlays })
    if (url === '/api/reports/map/') return Promise.resolve({ data: [] })
    return Promise.resolve({ data: [] })
  })
}

const mountHome = async () => {
  const wrapper = mount(HomeView, {
    global: { plugins: [createPinia(), makeRouter()], stubs: globalStubs },
  })
  await flushPromises()
  return wrapper
}

describe('HomeView (the map, spec map.md M1/M2/M3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })

  it('is the map view, with one toggle per layer plus the reports layer', async () => {
    const wrapper = await mountHome()

    expect(wrapper.find('h1').text()).toContain('La mappa di Gaeta')
    CARD_LAYERS.forEach((layer) => {
      const toggle = wrapper.find(`#layer-${layer.key}`)
      expect(toggle.exists()).toBe(true)
      expect((toggle.element as HTMLInputElement).checked).toBe(true)
      // ADR-0005: every input is associated with its own label.
      expect(wrapper.find(`label[for="layer-${layer.key}"]`).exists()).toBe(true)
    })
    expect(wrapper.find('#layer-segnalazioni').exists()).toBe(true)
  })

  it('drops a layer from the map when its toggle goes off', async () => {
    const wrapper = await mountHome()

    expect(wrapper.getComponent({ name: 'GaetaMap' }).props('features')).toHaveLength(2)

    await wrapper.find('#layer-chiese').setValue(false)

    const drawn = wrapper.getComponent({ name: 'GaetaMap' }).props('features') as typeof FEATURES
    expect(drawn.map((feature) => feature.type)).toEqual(['feste'])
  })

  it('lists the visible places as links — the keyboard path a pin does not have', async () => {
    const wrapper = await mountHome()

    const links = wrapper.findAll('a')
    expect(links.some((link) => link.attributes('href') === '/chiese/c1')).toBe(true)
    expect(links.some((link) => link.attributes('href') === '/feste/f1')).toBe(true)
  })

  it('draws an overlay only once it is switched on, with its opacity control', async () => {
    const wrapper = await mountHome()

    expect(wrapper.find('#overlay-o1').exists()).toBe(true)
    expect(wrapper.getComponent({ name: 'GaetaMap' }).props('overlays')).toEqual([])

    await wrapper.find('#overlay-o1').setValue(true)

    expect(wrapper.getComponent({ name: 'GaetaMap' }).props('overlays')).toHaveLength(1)
    expect(wrapper.find('#overlay-opacity-o1').exists()).toBe(true)
  })

  it('shows no overlay section at all when the reader has none', async () => {
    mockApi([])
    const wrapper = await mountHome()

    // A reader outside the steering tier must not be able to tell that a
    // hidden overlay exists (spec politics.md) — including from an empty
    // section header where one would be listed.
    expect(wrapper.text()).not.toContain('Sovrapposizioni')
  })
})
