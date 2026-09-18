import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'

import HomeView from '../HomeView.vue'
import { CARD_LAYERS } from '@/lib/mapLayers'
import { useMapStore } from '@/stores/map'

vi.mock('axios')

// The map itself is the shell's since the layout of 2026-09-18 (design.md
// D13): HomeView is the chrome over it, and it changes what the map draws
// through stores/map.ts. So "what the map draws" is asserted on the store —
// the map's own rendering of it is browser/Cypress territory, as before.
const globalStubs = {}

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
    cover: 'https://example.test/cover.jpg',
    points: [{ lat: 41.2, lng: 13.5, label: '' }],
    route: [],
  },
  {
    id: 'f1',
    type: 'feste',
    title: 'Processione di San Marciano',
    cover: null,
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

// Two pins, because the reports layer's own text list is the keyboard path to
// them (ADR-0005, closed 2026-09-05) and a list of one proves less.
const PINS = [
  {
    id: 'r1',
    title: 'Lampione spento in via Indipendenza',
    lat: 41.21,
    lng: 13.56,
    status: 'open',
    category_id: 'cat-1',
  },
  {
    id: 'r2',
    title: 'Panchina rotta al parco',
    lat: 41.22,
    lng: 13.57,
    status: 'resolved',
    category_id: 'cat-2',
  },
]

const mockApi = (overlays: unknown[] = OVERLAYS) => {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url === '/api/map/features/') return Promise.resolve({ data: FEATURES })
    if (url === '/api/map/overlays/') return Promise.resolve({ data: overlays })
    if (url === '/api/reports/map/') return Promise.resolve({ data: PINS })
    return Promise.resolve({ data: [] })
  })
}

const mountHome = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(HomeView, {
    global: { plugins: [pinia, makeRouter()], stubs: globalStubs },
  })
  await flushPromises()
  return wrapper
}

// jsdom has no matchMedia, and `useIsDesktop` deliberately defaults to the
// wide layout without it — which is what every test above relies on. This
// installs one so the small-first home can be mounted too.
const stubViewport = (isDesktop: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({
      matches: isDesktop,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
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

    expect(useMapStore().visibleFeatures).toHaveLength(2)

    await wrapper.find('#layer-chiese').setValue(false)

    expect(useMapStore().visibleFeatures.map((feature) => feature.type)).toEqual(['feste'])
  })

  it('lists the visible places as links — the keyboard path a pin does not have', async () => {
    const wrapper = await mountHome()

    const links = wrapper.findAll('a')
    expect(links.some((link) => link.attributes('href') === '/chiese/c1')).toBe(true)
    expect(links.some((link) => link.attributes('href') === '/feste/f1')).toBe(true)
  })

  // The map's data reaches a keyboard user as links, not as pins. This is the
  // "equivalent path" ADR-0005 closed its map-widget deferral on, so it is
  // pinned by a test rather than left to a reviewer's memory.
  it('lists every report on the map as a link, with its status in words', async () => {
    const wrapper = await mountHome()

    for (const pin of PINS) {
      const link = wrapper.find(
        `ul[aria-label="Segnalazioni sulla mappa"] a[href="/reports/${pin.id}"]`,
      )
      expect(link.exists()).toBe(true)
      expect(link.text()).toContain(pin.title)
    }

    // 1.4.1: on the map the pin's colour is the only thing that says
    // "resolved", so the list has to say it in words.
    expect(wrapper.find('a[href="/reports/r2"]').text()).toContain('Risolta')
  })

  it('takes reports out of the list when their layer is off, exactly as the map does', async () => {
    const wrapper = await mountHome()

    await wrapper.find('#layer-segnalazioni').setValue(false)

    expect(wrapper.find('a[href="/reports/r1"]').exists()).toBe(false)
  })

  it('draws an overlay only once it is switched on, with its opacity control', async () => {
    const wrapper = await mountHome()

    expect(wrapper.find('#overlay-o1').exists()).toBe(true)
    expect(useMapStore().visibleOverlays).toEqual([])

    await wrapper.find('#overlay-o1').setValue(true)

    expect(useMapStore().visibleOverlays).toHaveLength(1)
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

describe('HomeView on a phone (spec/design.md D3/D4/D5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
    stubViewport(false)
  })

  afterEach(() => {
    // @ts-expect-error — putting jsdom back the way it was found
    delete window.matchMedia
  })

  it('leads with the map and puts the places in a sheet, not a side panel', async () => {
    const wrapper = await mountHome()

    expect(wrapper.find('section[aria-label="Luoghi sulla mappa"]').exists()).toBe(true)
    // The wide layout's own furniture must not come along for the ride.
    expect(wrapper.find('#layer-chiese').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'MainTitle' }).exists()).toBe(false)
  })

  it('keeps the layer controls behind a floating button instead of beside the map (D4)', async () => {
    const wrapper = await mountHome()

    const button = wrapper.get('button[aria-controls="map-chrome-panel"]')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('#layer-chiese').exists()).toBe(false)

    await button.trigger('click')

    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('#layer-chiese').exists()).toBe(true)
  })

  it('renders exactly one set of layer controls, so no id is duplicated', async () => {
    const wrapper = await mountHome()
    await wrapper.get('button[aria-controls="map-chrome-panel"]').trigger('click')

    // Two copies of the toggles would mean two elements with id="layer-chiese",
    // which silently breaks the for/id pairing ADR-0005 requires — the reason
    // the two layouts are switched in JS rather than with `lg:hidden` on both.
    expect(wrapper.findAll('#layer-chiese')).toHaveLength(1)
  })

  it('lists the visible places in the sheet, with covers where a card has one (D5)', async () => {
    const wrapper = await mountHome()

    // Scoped to the places list rather than to the whole sheet: the sheet also
    // carries the reports list, which is a different list with its own label.
    const links = wrapper.findAll('ul[aria-label="Luoghi sulla mappa"] a')
    expect(links.map((link) => link.attributes('href'))).toEqual(['/chiese/c1', '/feste/f1'])
    // c1 has a cover; f1 has none and falls back to a coloured block.
    expect(wrapper.findAll('ul[aria-label="Luoghi sulla mappa"] img')).toHaveLength(1)
  })

  it("carries the reports list in the sheet too — the phone is the reader's layout", async () => {
    const wrapper = await mountHome()

    const links = wrapper.findAll('ul[aria-label="Segnalazioni sulla mappa"] a')
    expect(links.map((link) => link.attributes('href'))).toEqual(['/reports/r1', '/reports/r2'])
  })

  it('offers the sheet as a keyboard control, not only as a drag', async () => {
    const wrapper = await mountHome()

    // The drag has no keyboard equivalent, so the handle is a real button that
    // cycles the stops (WCAG 2.1.1), same pattern as every map editor here.
    const handle = wrapper.get('section[aria-label="Luoghi sulla mappa"] button')
    expect(handle.attributes('aria-expanded')).toBe('true')

    await handle.trigger('click')
    await handle.trigger('click')

    expect(handle.attributes('aria-expanded')).toBe('false')
  })
})
