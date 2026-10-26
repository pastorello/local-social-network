import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import WelcomeView from '../WelcomeView.vue'
import copy from '@/definitions/copy'
import type { MapCardFeature } from '@/definitions/interfaces/MapData'
import { useMapStore } from '@/stores/map'
import { useWizardStore } from '@/stores/wizard'

// The interface's default language (review PR-19a).
const PRESENTATION = copy.it.presentation

vi.mock('axios')
// Asked for once the page has painted (stores/map.ts, stores/wizard.ts,
// useArchiveLine): at once, here.
vi.mock('@/lib/firstPaint', () => ({ afterFirstPaint: () => Promise.resolve() }))

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
  kind: null,
  access: null,
  ...over,
})

const INTENTS = [
  { slug: 'mare', name: 'Andare al mare', description: 'Le spiagge', count: 0 },
  { slug: 'citta', name: 'Scoprire la città', description: '', count: 1 },
  { slug: 'camminare', name: 'Camminare', description: '', count: 0 },
  { slug: 'mangiare', name: 'Mangiare', description: '', count: 0 },
  { slug: 'bere', name: 'Bere', description: '', count: 0 },
]

const ZONES = [
  { slug: 'gaeta-medievale', name: 'Gaeta Medievale', count: 1, geometry: {} },
  { slug: 'serapo', name: 'Serapo', count: 1, geometry: {} },
  { slug: 'porto-salvo', name: 'Porto Salvo', count: 1, geometry: {} },
]

// The archive the wizard reads: a beach in Serapo; a castle in Gaeta
// Medievale and a church in Porto Salvo, with a tour starting there; a dish;
// a bar in Serapo; this week, two things on.
const FEATURES = [
  feature({ id: 'l1', title: 'Spiaggia di Serapo', genre: 'spiaggia', zones: ['serapo'] }),
  feature({ id: 'l2', title: 'Castello', genre: 'castello', zones: ['gaeta-medievale'] }),
  feature({ id: 'c1', type: 'chiese', title: 'Annunziata', zones: ['porto-salvo'] }),
  feature({ id: 'a1', type: 'attivita', title: 'Bar', kind: 'beve', zones: ['serapo'] }),
]

type Answers = Record<string, unknown>

const answers = (over: Answers = {}): Answers => ({
  '/api/itinerari/intenti/': INTENTS,
  '/api/itinerari/': {
    count: 1,
    results: [{ id: 't1', title: 'Giro', intents: ['citta'], zones: ['porto-salvo'] }],
  },
  '/api/map/zone/': ZONES,
  '/api/map/zone/alias/': [{ name: 'il castello', zone: 'gaeta-medievale' }],
  '/api/content/counts/': { ricette: 1 },
  oggi: { count: 0, results: [] },
  settimana: { count: 2, results: [] },
  ...over,
})

const answer = (over: Answers = {}, features = FEATURES) => {
  const data = answers(over)
  vi.mocked(axios.get).mockImplementation(async (url: string, config?: unknown) => {
    const finestra = (config as { params?: { finestra?: string } } | undefined)?.params?.finestra
    return { data: url === '/api/eventi/' ? data[finestra ?? ''] : data[url] }
  })
  return features
}

let wrapper: VueWrapper | null = null

const mountAt = async (path: string, features = FEATURES, attached = false) => {
  setActivePinia(createPinia())
  const store = useMapStore()
  store.features = features
  store.loaded = true
  store.featuresLoaded = true
  const stub = { template: '<div />' }
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      // The home since 2026-10-26, and the printed address that leads to it.
      { path: '/', name: 'home', component: WelcomeView },
      { path: '/benvenuto', redirect: (to) => ({ name: 'home', query: to.query }) },
      { path: '/mappa', name: 'mappa', component: stub },
      { path: '/cosa-fare', name: 'cosafare', component: stub },
      { path: '/eventi', name: 'eventilist', component: stub },
    ],
  })
  router.push(path)
  await router.isReady()
  wrapper = mount(WelcomeView, {
    global: { plugins: [router] },
    ...(attached ? { attachTo: document.body } : {}),
  })
  await flushPromises()
  return { wrapper, router }
}

const hrefs = (w: VueWrapper) => w.findAll('li a').map((a) => a.attributes('href'))

describe('WelcomeView — the wizard’s first step, on the address of a B&B’s card (I6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    answer()
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('asks one question, with one h1, and offers the answers that lead somewhere', async () => {
    const { wrapper } = await mountAt('/benvenuto')

    expect(wrapper.findAll('h1').map((h) => h.text())).toEqual(['Che cosa ti va di fare?'])
    // Camminare has nothing behind it, so it is not offered. Each answer
    // links where it leads: past «Dove?» when one zone holds all of it, to
    // «Ovunque a Gaeta» when none does (the dish), to «Dove?» otherwise.
    expect(hrefs(wrapper)).toEqual([
      '/cosa-fare?intento=mare&zona=serapo',
      '/?intento=citta',
      '/cosa-fare?intento=mangiare',
      '/cosa-fare?intento=bere&zona=serapo',
      '/eventi?finestra=settimana',
      '/mappa',
    ])
    expect(wrapper.text()).toContain('Le spiagge')
    expect(wrapper.text()).toContain('2 luoghi · 1 itinerario')
  })

  // Review PR-14 (P-07): a guest from the QR code is told what the site is, in
  // the home's own words (definitions/copy.ts), under the question.
  it('says what the site is under the question, as the home does', async () => {
    const { wrapper } = await mountAt('/benvenuto')

    expect(wrapper.html().indexOf(PRESENTATION)).toBeGreaterThan(
      wrapper.html().indexOf('Che cosa ti va di fare?'),
    )
  })

  // Cosa-fare.md Part −1 D9: «Oggi» and «Questa settimana» take the place of
  // «Una festa», each only when something falls in it, apart from the rest.
  it('offers «Oggi» and «Questa settimana» only when something falls in them', async () => {
    answer({ oggi: { count: 1, results: [] }, settimana: { count: 3, results: [] } })
    const both = await mountAt('/benvenuto')
    expect(both.wrapper.get('a[href="/eventi?finestra=oggi"]').text()).toContain('1 evento')
    expect(both.wrapper.get('a[href="/eventi?finestra=settimana"]').text()).toContain('3 eventi')
    expect(both.wrapper.get('h2').text()).toBe('In calendario')
    both.wrapper.unmount()

    answer({ settimana: { count: 0, results: [] } })
    const none = await mountAt('/benvenuto')
    expect(none.wrapper.find('a[href^="/eventi"]').exists()).toBe(false)
    expect(none.wrapper.find('h2').exists()).toBe(false)
    expect(none.wrapper.text()).not.toContain('Una festa')
  })

  // Decided on 2026-10-23: «Bere» only once a business where one drinks is
  // published.
  it('offers «Bere» only with a business where one drinks', async () => {
    const { wrapper } = await mountAt(
      '/benvenuto',
      FEATURES.filter((f) => f.kind !== 'beve'),
    )
    expect(wrapper.text()).not.toContain('Bere')
  })

  it('never says a place is open, and never asks how much time there is', async () => {
    const { wrapper } = await mountAt('/benvenuto')
    const text = wrapper.text().toLowerCase()
    expect(text).not.toMatch(/\baperto\b|\baperta\b/)
    expect(text).not.toMatch(/quanto tempo|ore hai|minuti/)
  })

  // Review PR-14 (M-09): each intent wears a tint of its own colour, a token
  // (D8), with its icon — and the windows the calendar's.
  it('gives each answer its tint and its icon, as tokens', async () => {
    const { wrapper } = await mountAt('/benvenuto')

    const tiles = wrapper.findAll('li a > span[aria-hidden="true"]')
    expect(tiles.slice(0, 5).map((tile) => tile.attributes('style'))).toEqual([
      expect.stringContaining('var(--color-intent-mare)'),
      expect.stringContaining('var(--color-intent-citta)'),
      expect.stringContaining('var(--color-intent-mangiare)'),
      expect.stringContaining('var(--color-intent-bere)'),
      expect.stringContaining('var(--color-intent-quando)'),
    ])
    tiles.forEach((tile) => expect(tile.find('svg').exists()).toBe(true))
  })

  // M-09: the ring is the keyboard's alone (focus-visible), and the pointer
  // gets no darker border.
  it('rings a card for the keyboard only, and darkens no border under the pointer', async () => {
    const { wrapper } = await mountAt('/benvenuto')

    wrapper.findAll('li a').forEach((card) => {
      const classes = card.classes()
      expect(classes).toContain('focus-visible:outline-2')
      expect(classes.filter((name) => name.startsWith('focus:'))).toEqual([])
      expect(classes.filter((name) => name.startsWith('hover:border'))).toEqual([])
    })
  })

  // Study 10: «Non lo so: fammi vedere la mappa» is an answer like the others;
  // it says «la mappa», never «esplora» — the menu's «Esplora» is on the same
  // screen (review PR-23).
  // Review PR-21b: the home asks the same question over the map, so this
  // answer lands on the map with the question already put away.
  it('lets the guest who does not know go to the map, the question put away there', async () => {
    const { wrapper, router } = await mountAt('/benvenuto')

    const out = wrapper.get('a[href="/mappa"]')
    expect(out.text()).toBe('Non lo so: fammi vedere la mappa')
    expect(wrapper.text().toLowerCase()).not.toContain('esplora')
    expect(useWizardStore().questionOpen).toBe(true)

    await out.trigger('click')
    await flushPromises()

    expect(useWizardStore().questionOpen).toBe(false)
    expect(router.currentRoute.value.path).toBe('/mappa')
  })

  // With one answer, the first step still asks: it is the first impression.
  it('asks the question with one answer too, and says so when there is none', async () => {
    answer({ '/api/content/counts/': { ricette: 0 }, settimana: { count: 0, results: [] } })
    const one = await mountAt('/benvenuto', [FEATURES[0]!])
    expect(one.wrapper.get('h1').text()).toBe('Che cosa ti va di fare?')
    expect(one.wrapper.findAll('li a').map((a) => a.text())[0]).toContain('Andare al mare')
    one.wrapper.unmount()

    answer({
      '/api/itinerari/intenti/': INTENTS.map((i) => ({ ...i, count: 0 })),
      '/api/content/counts/': { ricette: 0 },
      settimana: { count: 0, results: [] },
    })
    const none = await mountAt('/benvenuto', [])
    expect(none.wrapper.text()).toContain('Le proposte sono in preparazione')
    expect(none.wrapper.find('a[href="/mappa"]').exists()).toBe(true)
  })

  // «Oppure guarda cosa c'è in una zona» left the first step on 2026-10-26
  // (the author's decision): it said what «Non lo so: fammi vedere la mappa»
  // says, and «Cosa fare» in the menu is the zones' door — with places in
  // every zone, too.
  it('offers no door to the zones, whatever is in them', async () => {
    const { wrapper } = await mountAt('/benvenuto')
    expect(wrapper.find('a[href="/cosa-fare"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('in una zona')
  })

  it('draws nothing under the question before every count is in', async () => {
    setActivePinia(createPinia())
    vi.mocked(axios.get).mockImplementation(() => new Promise(() => {}))
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'home', component: WelcomeView }],
    })
    router.push('/')
    await router.isReady()
    wrapper = mount(WelcomeView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Che cosa ti va di fare?')
    expect(wrapper.text()).toContain(PRESENTATION)
    expect(wrapper.findAll('a')).toHaveLength(0)
  })
})

describe('WelcomeView — the wizard’s second step, «Dove?»', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    answer({
      '/api/itinerari/': {
        count: 1,
        results: [{ id: 't1', title: 'Giro', intents: ['citta'], zones: ['porto-salvo'] }],
      },
    })
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  // The address on a B&B's card leads to the home since 2026-10-26, its
  // query with it: a link to the second step still opens the second step.
  it('opens at the home from the address a card prints, the step with it', async () => {
    const { router } = await mountAt('/benvenuto?intento=citta')

    expect(router.currentRoute.value.fullPath).toBe('/?intento=citta')
  })

  it('says what was chosen, asks where, and offers the zones that hold it and «Ovunque»', async () => {
    const { wrapper } = await mountAt('/benvenuto?intento=citta')

    expect(wrapper.findAll('h1').map((h) => h.text())).toEqual(['Dove?'])
    const chosen = wrapper.get('p')
    expect(chosen.text()).toContain('Hai scelto:')
    expect(chosen.get('a').attributes('href')).toBe('/')
    expect(chosen.get('a').text()).toBe('Cambia la scelta: Scoprire la città')
    // No «Dove sei?» since 2026-10-26 (hidden for now by the author).
    expect(wrapper.find('input[role="combobox"]').exists()).toBe(false)
    expect(hrefs(wrapper)).toEqual([
      '/cosa-fare?intento=citta&zona=gaeta-medievale',
      '/cosa-fare?intento=citta&zona=porto-salvo',
      '/cosa-fare?intento=citta',
    ])
    expect(wrapper.text()).toContain('Annunziata · Giro')
    expect(wrapper.text()).toContain('Ovunque a Gaeta')
  })

  it('skips itself when one zone holds all of it, so Back goes to the first step', async () => {
    const { router } = await mountAt('/benvenuto')
    // The address of a skipped step, opened as a link would open it.
    await router.push('/benvenuto?intento=mare')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/cosa-fare?intento=mare&zona=serapo')
    router.back()
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('asks the first question again on an intent with nothing behind it', async () => {
    const { router, wrapper } = await mountAt('/benvenuto?intento=camminare')

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(wrapper.get('h1').text()).toBe('Che cosa ti va di fare?')
  })

  // ADR-0005: at every step the focus is on the question, the step's one h1.
  it('puts the focus on the question when the step changes, and back', async () => {
    const { wrapper, router } = await mountAt('/benvenuto', FEATURES, true)

    await router.push('/benvenuto?intento=citta')
    await flushPromises()
    expect(document.activeElement?.textContent?.trim()).toBe('Dove?')
    expect(document.activeElement?.hasAttribute('data-panel-focus')).toBe(true)

    router.back()
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Che cosa ti va di fare?')
    expect(document.activeElement?.textContent?.trim()).toBe('Che cosa ti va di fare?')
  })
})
