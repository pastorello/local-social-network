import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { shallowRef } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import CosaFareView from '../CosaFareView.vue'
import { PANEL_TRAIL, type Trail } from '@/composables/usePanelTrail'
import { useMapStore } from '@/stores/map'
import type { MapCardFeature } from '@/definitions/interfaces/MapData'

vi.mock('axios')

const feature = (over: Partial<MapCardFeature>): MapCardFeature => ({
  id: 'x',
  type: 'luoghi',
  title: 'X',
  is_published: true,
  cover: null,
  points: [],
  route: [],
  zones: [],
  genre: null,
  access: null,
  ...over,
})

const at = (lat: number, lng: number) => [{ lat, lng, label: '' }]

const FEATURES = [
  feature({
    id: 'l1',
    title: 'Spiaggia di Serapo',
    genre: 'spiaggia',
    zones: ['serapo'],
    points: at(41.21, 13.56),
  }),
  feature({
    id: 'l2',
    title: 'Belvedere',
    genre: 'punto-panoramico',
    zones: ['serapo'],
    points: at(41.22, 13.55),
  }),
  feature({
    id: 'c1',
    type: 'chiese',
    title: 'Annunziata',
    zones: ['serapo'],
    access: 'services',
    points: at(41.215, 13.565),
  }),
  feature({ id: 'c2', type: 'chiese', title: 'Duomo', zones: ['gaeta-medievale'] }),
  feature({ id: 'l3', title: 'Arenauta', genre: 'spiaggia', zones: [] }),
  feature({
    id: 'f1',
    type: 'feste',
    title: 'Porto Salvo',
    zones: ['serapo'],
    route: [...at(41.212, 13.558), ...at(41.225, 13.57)],
  }),
  feature({
    id: 'r1',
    type: 'ricette',
    title: 'Tiella',
    zones: ['serapo'],
    points: at(41.3, 13.7),
  }),
]

// GeoJSON: [lng, lat].
const square = (south: number, west: number, north: number, east: number) => ({
  type: 'Polygon',
  coordinates: [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ],
})

const ANSWERS: Record<string, unknown> = {
  '/api/map/zone/': [
    { slug: 'serapo', name: 'Serapo', count: 3, geometry: square(41.2, 13.54, 41.23, 13.58) },
    {
      slug: 'gaeta-medievale',
      name: 'Gaeta Medievale',
      count: 1,
      geometry: square(41.205, 13.57, 41.215, 13.59),
    },
    {
      slug: 'monte-orlando',
      name: 'Monte Orlando',
      count: 0,
      geometry: {
        type: 'MultiPolygon',
        coordinates: [square(41.2, 13.56, 41.21, 13.57).coordinates],
      },
    },
  ],
  '/api/itinerari/intenti/': [
    { slug: 'mare', name: 'Andare al mare' },
    { slug: 'mangiare', name: 'Mangiare' },
    { slug: 'citta', name: 'Scoprire la città' },
    { slug: 'camminare', name: 'Camminare' },
  ],
  '/api/luoghi/generi/': [
    { slug: 'spiaggia', name: 'Spiaggia' },
    { slug: 'punto-panoramico', name: 'Punto panoramico' },
  ],
  '/api/itinerari/': {
    results: [
      { id: 't1', title: 'Giro di Serapo', zones: ['serapo'], intents: ['mare'] },
      { id: 't2', title: 'Giro del centro', zones: ['gaeta-medievale'], intents: ['citta'] },
    ],
  },
  '/api/feste/': { results: [{ id: 'f1', title: 'Porto Salvo', recurrence: 'Ogni 9 agosto' }] },
  '/api/ricette/': {
    results: [
      { id: 'r2', title: 'Zuppa' },
      { id: 'r1', title: 'Tiella' },
    ],
  },
  '/api/map/zone/alias/': [
    { name: 'il castello', zone: 'gaeta-medievale' },
    { name: 'la Cattedrale', zone: 'gaeta-medievale' },
  ],
}

const mountAt = async (
  query: Record<string, string> = {},
  trail = shallowRef<Trail | null>(null),
  // In the document, for what focus and visibility need.
  attached = false,
  // Whether the map's features have come back yet (TD-53).
  featuresIn = true,
) => {
  setActivePinia(createPinia())
  const store = useMapStore()
  store.features = featuresIn ? FEATURES : []
  store.loaded = true
  store.featuresLoaded = featuresIn
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/cosa-fare', name: 'cosafare', component: CosaFareView },
      { path: '/benvenuto', name: 'benvenuto', component: stub },
      { path: '/:rest(.*)*', name: 'itinerariodetail', component: stub },
    ],
  })
  await router.push({ path: '/cosa-fare', query })
  await router.isReady()
  // What the panel would draw over the page (review PR-23).
  const wrapper = mount(CosaFareView, {
    global: { plugins: [router], provide: { [PANEL_TRAIL as symbol]: trail } },
    ...(attached ? { attachTo: document.body } : {}),
  })
  await flushPromises()
  return { wrapper, store, router, trail }
}

describe('CosaFareView — «Cosa si può fare qui» (spec cosa-fare.md Part −1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation(async (url: string) => ({ data: ANSWERS[url] }))
  })

  it('offers the zones, says they are not official, and «Altrove» only for what is outside', async () => {
    const { wrapper } = await mountAt()

    const chips = wrapper.findAll('nav[aria-label="Zone"] a').map((a) => a.text())
    expect(chips).toEqual(['Serapo 3', 'Gaeta Medievale 1', 'Monte Orlando 0', 'Altrove a Gaeta 1'])
    expect(wrapper.text()).toContain('Zone indicative, non confini ufficiali.')
    expect(wrapper.text()).toContain('Scegli una zona')
  })

  it('lists the reader’s own drafts in their zone, marked, and counts them on its chip (map.md M5)', async () => {
    const { wrapper } = await mountAt({ zona: 'monte-orlando' })
    const store = useMapStore()
    store.features = [
      ...FEATURES,
      feature({
        id: 'd1',
        title: 'Mausoleo',
        genre: 'punto-panoramico',
        zones: ['monte-orlando'],
        is_published: false,
      }),
    ]
    await flushPromises()

    const chips = wrapper.findAll('nav[aria-label="Zone"] a').map((a) => a.text())
    expect(chips).toContain('Monte Orlando 1')
    const row = wrapper.findAll('li').find((li) => li.text().includes('Mausoleo'))
    expect(row?.text()).toContain('bozza')
    expect(wrapper.findAll('li').find((li) => li.text().includes('Belvedere'))).toBeUndefined()
  })

  it('lists a zone by activity, alphabetically, with what is known about getting in', async () => {
    const { wrapper } = await mountAt({ zona: 'serapo' })

    // The zone's own blocks first, in the author's order of intents, and the
    // dishes — which are for all of Gaeta — last (review PR-4).
    const headings = wrapper.findAll('h2').map((h) => h.text())
    expect(headings).toEqual([
      'Andare al mare',
      'Scoprire la città',
      'Camminare',
      'Itinerari che passano di qui',
      'Le feste di questa zona',
      'Mangiare',
    ])
    // Every section says its order under its own heading, and no orphan line
    // says it for all of them.
    for (const section of wrapper.findAll('section')) {
      expect(section.text()).toContain('in ordine alfabetico')
    }
    expect(wrapper.text()).not.toContain('In ordine alfabetico.')
    expect(wrapper.text()).toContain('Annunziata')
    expect(wrapper.text()).toContain('Chiesa · Si entra solo durante le funzioni.')
    expect(wrapper.text()).toContain('Giro di Serapo')
    expect(wrapper.text()).not.toContain('Giro del centro')
    expect(wrapper.text()).toContain('Ogni 9 agosto')
    // Nothing on this page ever says a place is open (ADR-0008).
    expect(wrapper.text().toLowerCase()).not.toMatch(/\baperto\b|\baperta\b/)
  })

  it('shows the dishes for all of Gaeta, alphabetically, whatever the zone', async () => {
    const { wrapper } = await mountAt({ zona: 'gaeta-medievale' })

    const section = wrapper.findAll('section').find((s) => s.find('h2').text() === 'Mangiare')!
    expect(section.findAll('li').map((li) => li.text())).toEqual(['Tiella', 'Zuppa'])
    expect(section.text()).toContain('valgono per tutta Gaeta')
  })

  it('says a zone is empty and points at the zones that are not', async () => {
    const { wrapper } = await mountAt({ zona: 'monte-orlando' })

    expect(wrapper.text()).toContain("In questa zona l'archivio non ha ancora niente.")
    expect(wrapper.text()).toContain('Prova Serapo, Gaeta Medievale, Altrove a Gaeta.')
    // The dishes are still offered, and still last.
    expect(wrapper.findAll('h2').map((h) => h.text())).toEqual(['Mangiare'])
  })

  it('has the map draw exactly the zone’s places and feste, and lets go on leaving', async () => {
    const { wrapper, store } = await mountAt({ zona: 'serapo' })

    expect([...(store.restrictTo ?? [])].sort()).toEqual(['c1', 'f1', 'l1', 'l2'])

    wrapper.unmount()
    expect(store.restrictTo).toBeNull()
  })

  it('frames the zone’s set — pins and processions, not the dishes — and lets go on leaving', async () => {
    const { wrapper, store } = await mountAt({ zona: 'serapo' })

    expect(store.frame).toEqual([
      { lat: 41.21, lng: 13.55 },
      { lat: 41.225, lng: 13.57 },
    ])

    wrapper.unmount()
    expect(store.frame).toBeNull()
  })

  it('frames an empty zone by its outline, and the whole of Gaeta when none is chosen', async () => {
    const { store, router } = await mountAt({ zona: 'monte-orlando' })
    expect(store.frame).toEqual([
      { lat: 41.2, lng: 13.56 },
      { lat: 41.21, lng: 13.57 },
    ])

    await router.push({ path: '/cosa-fare' })
    await flushPromises()
    expect(store.frame).toEqual([
      { lat: 41.2, lng: 13.54 },
      { lat: 41.23, lng: 13.59 },
    ])
  })
})

// ADR-0010 (built 2026-10-25): a zone's businesses are rows of it, under
// «Bere» and — beside the dishes, never instead of them — under «Mangiare»;
// alphabetical like every row here, and never counted on a zone's chip.
describe('CosaFareView — the businesses (ADR-0010)', () => {
  const BUSINESSES = [
    feature({
      id: 'a1',
      type: 'attivita',
      title: 'Vineria',
      kind: 'beve',
      zones: ['serapo'],
      points: at(41.211, 13.561),
    }),
    feature({
      id: 'a2',
      type: 'attivita',
      title: 'Bar Ariana',
      kind: 'beve',
      zones: ['serapo'],
      points: at(41.212, 13.562),
    }),
    feature({ id: 'a3', type: 'attivita', title: 'Trattoria', kind: 'mangia', zones: ['serapo'] }),
    feature({ id: 'a4', type: 'attivita', title: 'Forno', kind: 'compra', zones: ['serapo'] }),
    feature({
      id: 'a5',
      type: 'attivita',
      title: 'Chiosco',
      kind: 'beve',
      zones: ['monte-orlando'],
    }),
  ]
  const intents = ANSWERS['/api/itinerari/intenti/'] as { slug: string; name: string }[]
  const WITH_BERE: Record<string, unknown> = {
    ...ANSWERS,
    '/api/itinerari/intenti/': [...intents, { slug: 'bere', name: 'Bere' }],
  }
  const mountWithBusinesses = async (query: Record<string, string>) => {
    const mounted = await mountAt(query)
    mounted.store.features = [...FEATURES, ...BUSINESSES]
    await flushPromises()
    return mounted
  }
  const section = (wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper'], name: string) =>
    wrapper.findAll('section').find((s) => s.find('h2').text() === name)!

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation(async (url: string) => ({ data: WITH_BERE[url] }))
  })

  it('lists where one drinks under «Bere», alphabetically, saying what each is', async () => {
    const { wrapper } = await mountWithBusinesses({ zona: 'serapo' })

    expect(wrapper.findAll('h2').map((h) => h.text())).toEqual([
      'Andare al mare',
      'Scoprire la città',
      'Camminare',
      'Bere',
      'Itinerari che passano di qui',
      'Le feste di questa zona',
      'Mangiare',
    ])
    const bere = section(wrapper, 'Bere')
    expect(bere.findAll('li a').map((a) => a.text())).toEqual(['Bar Ariana', 'Vineria'])
    expect(bere.text()).toContain('Dove si beve')
    expect(bere.text()).toContain('in ordine alfabetico')
  })

  it('opens «Mangiare» on the zone’s tables and botteghe, then the dishes for all of Gaeta', async () => {
    const { wrapper } = await mountWithBusinesses({ zona: 'serapo' })

    const mangiare = section(wrapper, 'Mangiare')
    const lists = mangiare.findAll('ul')
    expect(lists).toHaveLength(2)
    expect(lists[0]!.findAll('li a').map((a) => a.text())).toEqual(['Forno', 'Trattoria'])
    expect(lists[0]!.text()).toContain('Dove si compra')
    expect(lists[0]!.text()).toContain('Dove si mangia')
    expect(lists[1]!.findAll('li a').map((a) => a.text())).toEqual(['Tiella', 'Zuppa'])
    // The note stands between the two: it is about the dishes alone.
    expect(mangiare.text().indexOf('Trattoria')).toBeLessThan(
      mangiare.text().indexOf('valgono per tutta Gaeta'),
    )
    expect(mangiare.text().indexOf('valgono per tutta Gaeta')).toBeLessThan(
      mangiare.text().indexOf('Tiella'),
    )
  })

  it('never counts a business on a zone’s chip, but a zone that has one is not empty', async () => {
    const { wrapper } = await mountWithBusinesses({ zona: 'monte-orlando' })

    const chips = wrapper.findAll('nav[aria-label="Zone"] a').map((a) => a.text())
    expect(chips).toContain('Monte Orlando 0')
    expect(wrapper.text()).not.toContain("l'archivio non ha ancora niente")
    expect(
      section(wrapper, 'Bere')
        .findAll('li a')
        .map((a) => a.text()),
    ).toEqual(['Chiosco'])
  })

  it('has the map draw the zone’s businesses with its places, and frame them', async () => {
    const { store } = await mountWithBusinesses({ zona: 'serapo' })

    expect([...(store.restrictTo ?? [])].sort()).toEqual([
      'a1',
      'a2',
      'a3',
      'a4',
      'c1',
      'f1',
      'l1',
      'l2',
    ])
  })
})

describe('CosaFareView on a phone (review PR-4, M-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation(async (url: string) => ({ data: ANSWERS[url] }))
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  const chipNames = (wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) =>
    wrapper.findAll('#zone-chips a').map((a) => a.text())

  it('says what the page is in one line, and offers every zone in one row', async () => {
    const { wrapper } = await mountAt()

    expect(wrapper.text()).toContain('Luoghi, itinerari e feste, zona per zona.')
    expect(wrapper.text()).not.toContain('gli itinerari che ci passano')
    expect(chipNames(wrapper)).toHaveLength(4)
    expect(wrapper.find('#zone-chips').classes()).toContain('overflow-x-auto')
    expect(wrapper.find('button[aria-controls~="zone-chips"]').exists()).toBe(false)
  })

  it('puts the other zones away once one is chosen, and «Cambia zona» brings them back', async () => {
    const { wrapper, router } = await mountAt({ zona: 'serapo' })

    expect(chipNames(wrapper)).toEqual(['Serapo 3'])
    const toggle = wrapper.find('button[aria-controls~="zone-chips"]')
    expect(toggle.text()).toBe('Cambia zona')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')
    expect(chipNames(wrapper)).toHaveLength(4)
    expect(toggle.attributes('aria-expanded')).toBe('true')

    // Choosing another zone puts them away again; the address is the choice.
    await router.push({ path: '/cosa-fare', query: { zona: 'gaeta-medievale' } })
    await flushPromises()
    expect(chipNames(wrapper)).toEqual(['Gaeta Medievale 1'])
    expect(router.currentRoute.value.query.zona).toBe('gaeta-medievale')
  })

  // Review PR-20: «Dove sei?» is a way of choosing, so it steps aside with
  // the chips — and the line saying what it chose stays.
  it('puts «Dove sei?» away with the chips, and hands focus to «Cambia zona»', async () => {
    const { wrapper, router } = await mountAt({}, undefined, true)
    const field = wrapper.get<HTMLInputElement>('input[role="combobox"]')
    expect(field.isVisible()).toBe(true)

    field.element.focus()
    await field.setValue('castello')
    await field.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ zona: 'gaeta-medievale' })
    expect(field.isVisible()).toBe(false)
    expect(wrapper.text()).toContain('Sei al castello: ti mostriamo Gaeta Medievale.')
    const toggle = wrapper.get('button[aria-controls~="zone-chips"]')
    expect(document.activeElement).toBe(toggle.element)
    expect(toggle.attributes('aria-controls')!.split(' ')).toContain('dove-sei')

    await toggle.trigger('click')
    expect(field.isVisible()).toBe(true)
    wrapper.unmount()
  })

  it('opens a zone’s address with the question already put away, not folding it later', async () => {
    // The zones never come: what is drawn first is all there is.
    vi.mocked(axios.get).mockImplementation(() => new Promise(() => {}))
    const { wrapper } = await mountAt({ zona: 'serapo' }, undefined, true)

    expect(wrapper.get('input[role="combobox"]').isVisible()).toBe(false)
    wrapper.unmount()
  })

  it('asks again on the address of a zone the archive does not have', async () => {
    const { wrapper } = await mountAt({ zona: 'atlantide' }, undefined, true)

    expect(wrapper.get('input[role="combobox"]').isVisible()).toBe(true)
    expect(wrapper.text()).toContain('A Gaeta')
    wrapper.unmount()
  })

  // TD-53: what a phone draws before the zones come is what stays once they
  // have — no «A Gaeta» taken back from over the title, no row of chips
  // growing under it.
  it('draws a zone’s address as chosen from the first frame, its row of zones already a row tall', async () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise(() => {}))
    const { wrapper } = await mountAt({ zona: 'serapo' })

    expect(wrapper.text()).not.toContain('A Gaeta')
    expect(wrapper.get('nav[aria-label="Zone"] > div').classes()).toContain('min-h-10')
  })
})

// TD-53: the rows come from the page's own lists and from the map's features,
// and land together — with the closing note, which they would otherwise push.
describe('CosaFareView — the rows land in one piece (TD-53)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation(async (url: string) => ({ data: ANSWERS[url] }))
  })

  const NOTE = "Questo è quello che c'è in archivio"

  it('draws nothing under the zones until the map’s features are in too, then all of it', async () => {
    const { wrapper, store } = await mountAt({ zona: 'serapo' }, undefined, false, false)

    // The tours and the dishes are in, but not the zone's places: drawing them
    // would put the places above them a moment later, or call the zone empty.
    expect(wrapper.findAll('h2')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('non ha ancora niente')
    expect(wrapper.text()).not.toContain(NOTE)

    store.features = FEATURES
    store.featuresLoaded = true
    await flushPromises()

    expect(wrapper.findAll('h2').map((h) => h.text())[0]).toBe('Andare al mare')
    expect(wrapper.text()).toContain(NOTE)
  })

  it('waits for the page’s own lists too', async () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise(() => {}))
    const { wrapper } = await mountAt({ zona: 'serapo' })

    expect(wrapper.text()).not.toContain(NOTE)
    expect(wrapper.text()).not.toContain("Scegli una zona per vedere cosa c'è.")
  })

  // Nothing under the zones depends on an answer then, and the note is the
  // largest text on a phone's first screen: drawn late, it is the page's LCP.
  it('says everything at once when no zone is chosen, waiting for nothing', async () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise(() => {}))
    const { wrapper } = await mountAt({}, undefined, false, false)

    expect(wrapper.text()).toContain("Scegli una zona per vedere cosa c'è.")
    expect(wrapper.text()).toContain(NOTE)
  })
})

// Review PR-23: a chosen zone is where the reader stands, under «Cosa fare»
// — the panel's eyebrow says so, and the window's title.
describe('CosaFareView — eyebrow and title (review PR-23)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation(async (url: string) => ({ data: ANSWERS[url] }))
  })

  it('hands the panel the chosen zone, and lets its own «A Gaeta» go', async () => {
    const { wrapper, trail } = await mountAt({ zona: 'serapo' })

    expect(trail.value).toEqual({ steps: [{ label: 'Serapo' }] })
    expect(wrapper.text()).not.toContain('A Gaeta')
    expect(document.title).toBe('Serapo · Cosa fare · Vivere Gaeta')
  })

  it('has no eyebrow to hand over before a zone is chosen, and says «A Gaeta» itself', async () => {
    const { wrapper, trail } = await mountAt()

    expect(trail.value).toBeNull()
    expect(wrapper.text()).toContain('A Gaeta')
  })
})

// Review PR-20: «Dove sei?» picks the zone from the name of where the guest
// stands, as a chip would — the address is the choice.
describe('CosaFareView — «Dove sei?» (review PR-20)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation(async (url: string) => ({ data: ANSWERS[url] }))
  })

  it('asks above the zones, and asks no service but the archive', async () => {
    const { wrapper } = await mountAt()

    const field = wrapper.get('input[role="combobox"]')
    const chips = wrapper.get('nav[aria-label="Zone"]')
    expect(
      field.element.compareDocumentPosition(chips.element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    const asked = vi.mocked(axios.get).mock.calls.map(([url]) => url)
    expect(asked).toContain('/api/map/zone/alias/')
    expect(asked.every((url) => url.startsWith('/api/'))).toBe(true)
  })

  it('shows the zone of the place named, and says so', async () => {
    const { wrapper, router } = await mountAt()

    await wrapper.get('input[role="combobox"]').setValue('castello')
    await wrapper.get('input[role="combobox"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ zona: 'gaeta-medievale' })
    expect(wrapper.text()).toContain('Sei al castello: ti mostriamo Gaeta Medievale.')
    expect(wrapper.text()).toContain('Duomo')
  })

  it('leaves the zone alone for a name it does not know', async () => {
    const { wrapper, router } = await mountAt({ zona: 'serapo' })

    await wrapper.get('input[role="combobox"]').setValue('xyz')
    await wrapper.get('input[role="combobox"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ zona: 'serapo' })
    expect(wrapper.text()).toContain('Non conosciamo questo posto: scegli una zona qui sotto.')
  })
})

// The wizard «Cosa fare adesso» (review PR-21, study 10): its third step is
// this page opened on `?intento=` — the intent's tours and section first and
// open, the rest of the zone put away; with no zone, the intent alone.
describe('CosaFareView — the wizard’s third step (review PR-21)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation(async (url: string) => ({ data: ANSWERS[url] }))
  })

  const headings = (wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) =>
    wrapper
      .findAll('h2 button')
      .map((button) => [button.text().replace(/\s+\d+$/, ''), button.attributes('aria-expanded')])

  it('says what was chosen, each answer a way back to the step that asked it', async () => {
    const { wrapper } = await mountAt({ intento: 'mare', zona: 'serapo' })

    const chosen = wrapper.findAll('p').find((p) => p.text().startsWith('Hai scelto:'))!
    expect(chosen.text()).toBe(
      'Hai scelto: Cambia la scelta: Andare al mare · Cambia la scelta: Serapo',
    )
    expect(chosen.findAll('a').map((a) => a.attributes('href'))).toEqual([
      '/benvenuto',
      '/benvenuto?intento=mare',
    ])
    // The question it answers is the one h1, and takes the focus (ADR-0005).
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('h1').attributes('data-panel-focus')).toBeDefined()
    // It asks nothing: the zone was the step before.
    expect(wrapper.find('nav[aria-label="Zone"]').exists()).toBe(false)
    expect(wrapper.find('input[role="combobox"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Zone indicative, non confini ufficiali.')
  })

  it('opens on the intent’s tours and its section, and puts the rest of the zone away', async () => {
    const { wrapper } = await mountAt({ intento: 'mare', zona: 'serapo' })

    expect(headings(wrapper)).toEqual([
      ['Itinerari che passano di qui', 'true'],
      ['Andare al mare', 'true'],
      ['Scoprire la città', 'false'],
      ['Camminare', 'false'],
      ['Le feste di questa zona', 'false'],
      ['Mangiare', 'false'],
    ])
    expect(wrapper.text()).toContain('Giro di Serapo')
    expect(wrapper.get('#sezione-citta').isVisible()).toBe(false)
    expect(wrapper.text().toLowerCase()).not.toMatch(/\baperto\b|\baperta\b/)
  })

  it('opens a section put away at the reader’s word, and the map draws what is open', async () => {
    const { wrapper, store } = await mountAt({ intento: 'mare', zona: 'serapo' })

    expect(store.restrictTo).toEqual(['l1'])
    await wrapper.findAll('h2 button')[2]!.trigger('click')
    expect(wrapper.findAll('h2 button')[2]!.attributes('aria-expanded')).toBe('true')
    expect([...(store.restrictTo ?? [])].sort()).toEqual(['c1', 'l1'])
    expect(store.frame).toEqual([
      { lat: 41.21, lng: 13.56 },
      { lat: 41.215, lng: 13.565 },
    ])
  })

  it('shows the intent alone, from all over Gaeta, with no zone', async () => {
    const { wrapper, store } = await mountAt({ intento: 'mare' })

    expect(headings(wrapper)).toEqual([
      ['Itinerari', 'true'],
      ['Andare al mare', 'true'],
    ])
    expect(wrapper.text()).toContain('Ovunque a Gaeta')
    expect(
      wrapper
        .get('#sezione-mare')
        .findAll('li a')
        .map((a) => a.text()),
    ).toEqual(['Arenauta', 'Spiaggia di Serapo'])
    expect([...(store.restrictTo ?? [])].sort()).toEqual(['l1', 'l3'])
    expect(document.title).toBe('Andare al mare · Cosa fare · Vivere Gaeta')
  })

  it('opens «Mangiare» on the dishes for all of Gaeta', async () => {
    const { wrapper } = await mountAt({ intento: 'mangiare', zona: 'serapo' })

    expect(headings(wrapper)[0]).toEqual(['Mangiare', 'true'])
    expect(wrapper.get('#sezione-mangiare').text()).toContain('valgono per tutta Gaeta')
    expect(document.title).toBe('Mangiare · Serapo · Cosa fare · Vivere Gaeta')
  })

  it('says when the zone has nothing of it, and where it is instead', async () => {
    const { wrapper } = await mountAt({ intento: 'camminare', zona: 'gaeta-medievale' })

    expect(wrapper.text()).toContain("Qui l'archivio non ha ancora niente per «Camminare».")
    const links = wrapper.findAll('p a').filter((a) => !a.text().startsWith('Cambia'))
    expect(links.map((a) => [a.text(), a.attributes('href')])).toEqual([
      ['Serapo', '/cosa-fare?intento=camminare&zona=serapo'],
      ['ovunque a Gaeta', '/cosa-fare?intento=camminare'],
    ])
    // The rest of the zone is still there, put away.
    expect(headings(wrapper).map(([name]) => name)).toEqual([
      'Scoprire la città',
      'Itinerari che passano di qui',
      'Mangiare',
    ])
  })

  it('says a skipped step’s answer without a link back to it', async () => {
    const { wrapper } = await mountAt({ intento: 'citta', zona: 'gaeta-medievale' })

    // Scoprire la città: the Duomo and a tour in Gaeta Medievale, the
    // Annunziata in Serapo — two zones, so «Dove?» asks. Camminare's one
    // place is in Serapo alone: it would not.
    const chosen = wrapper.findAll('p').find((p) => p.text().startsWith('Hai scelto:'))!
    expect(chosen.findAll('a')).toHaveLength(2)

    const { wrapper: walk } = await mountAt({ intento: 'camminare', zona: 'serapo' })
    const walked = walk.findAll('p').find((p) => p.text().startsWith('Hai scelto:'))!
    expect(walked.findAll('a').map((a) => a.attributes('href'))).toEqual(['/benvenuto'])
    expect(walked.text()).toContain('Serapo')
  })
})
