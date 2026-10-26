import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'

import HomeView from '../HomeView.vue'
import copy from '@/definitions/copy'
import { CARD_LAYERS } from '@/lib/mapLayers'
import { useMapStore } from '@/stores/map'
import { useUserStore } from '@/stores/user'

// The interface's default language (review PR-19a).
const PRESENTATION = copy.it.presentation

vi.mock('axios')
// The map's data is asked for once the page has painted (stores/map.ts): at
// once, here.
vi.mock('@/lib/firstPaint', () => ({ afterFirstPaint: () => Promise.resolve() }))

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
      // The welcome page is the home since 2026-10-26, and the map — this
      // view's page — is /mappa.
      { path: '/', name: 'home', component: stub },
      { path: '/mappa', name: 'mappa', component: stub },
      { path: '/login', name: 'login', component: stub },
      { path: '/chiese/:id', name: 'chiesedetail', component: stub },
      { path: '/feste/:id', name: 'festedetail', component: stub },
      { path: '/cosa-fare', name: 'cosafare', component: stub },
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

// What the wizard's first question is answered with (lib/wizard.ts, review
// PR-21b): one intent with a tour and one with nothing behind it; one zone
// with a published place and one without.
const INTENTS = [
  { slug: 'citta', name: 'Scoprire la città', name_plural: '', description: '', count: 2 },
  { slug: 'mangiare', name: 'Mangiare', name_plural: '', description: '', count: 0 },
]
const ZONES = [
  { slug: 'serapo', name: 'Serapo', geometry: { type: 'Polygon', coordinates: [] }, count: 0 },
  {
    slug: 'porto-salvo',
    name: 'Porto Salvo',
    geometry: { type: 'Polygon', coordinates: [] },
    count: 1,
  },
]

// The archive's line under the presentation (review PR-18).
const STATS = { published: 15, last_updated: '2026-10-22' }
const ARCHIVE_LINE = '15 schede, l’ultima aggiornata il 22 ottobre 2026'

const mockApi = (
  overlays: unknown[] = OVERLAYS,
  {
    intents = INTENTS,
    zones = ZONES,
    stats = STATS,
  }: { intents?: unknown[]; zones?: unknown[]; stats?: unknown } = {},
) => {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url === '/api/map/features/') return Promise.resolve({ data: FEATURES })
    if (url === '/api/map/overlays/') return Promise.resolve({ data: overlays })
    if (url === '/api/reports/map/') return Promise.resolve({ data: PINS })
    if (url === '/api/itinerari/intenti/') return Promise.resolve({ data: intents })
    if (url === '/api/map/zone/') return Promise.resolve({ data: zones })
    if (url === '/api/content/stats/') return Promise.resolve({ data: stats })
    return Promise.resolve({ data: [] })
  })
}

// Signed out by default: the reader is who the home is for. A collaborator is
// who has reports at all (decided 2026-10-22, reports-and-polls.md R1).
const mountHome = async ({ signedIn = false, attach = false } = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (signedIn) useUserStore().user.isAuthenticated = true
  const router = makeRouter()
  router.push('/mappa')
  await router.isReady()
  const wrapper = mount(HomeView, {
    global: { plugins: [pinia, router], stubs: globalStubs },
    ...(attach ? { attachTo: document.body } : {}),
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

  it('is the map view, with one toggle per card layer', async () => {
    const wrapper = await mountHome()

    expect(wrapper.find('h1').text()).toContain('La mappa di Gaeta')
    CARD_LAYERS.forEach((layer) => {
      const toggle = wrapper.find(`#layer-${layer.key}`)
      expect(toggle.exists()).toBe(true)
      expect((toggle.element as HTMLInputElement).checked).toBe(true)
      // ADR-0005: every input is associated with its own label.
      expect(wrapper.find(`label[for="layer-${layer.key}"]`).exists()).toBe(true)
    })
  })

  // One front door (review PR-21b, decided on 2026-10-22): a reader from a
  // search engine meets the wizard's first question over the map, as the guest
  // from a B&B's card meets it on /benvenuto — under the presentation and the
  // map's own title, which stays the page's one h1.
  it('says what the site is, then asks the wizard’s first question over the layers', async () => {
    const wrapper = await mountHome()

    expect(wrapper.findAll('h1').map((h) => h.text())).toEqual(['La mappa di Gaeta'])
    const text = wrapper.text()
    expect(text.indexOf(PRESENTATION)).toBeLessThan(text.indexOf('Che cosa ti va di fare?'))
    expect(wrapper.get('h2').text()).toBe('Che cosa ti va di fare?')
    // Its answers lead where /benvenuto's do; Mangiare has nothing behind it.
    expect(wrapper.get('a[href="/cosa-fare?intento=citta"]').text()).toContain('Scoprire la città')
    expect(wrapper.text()).not.toContain('Mangiare')
    // No door to the zones since 2026-10-26: «Cosa fare» in the menu is it.
    expect(wrapper.find('a[href="/cosa-fare"]').exists()).toBe(false)
    // The two doors of review PR-2 were its answers, then the zones' left.
    expect(wrapper.find('a[href="/"]').exists()).toBe(false)
    // Above the layers.
    const column = wrapper.html()
    expect(column.indexOf('Che cosa ti va di fare?')).toBeLessThan(column.indexOf('layer-chiese'))
  })

  // The same rule as /benvenuto's: an empty archive promises nothing, and the
  // question is asked all the same — it is the first impression.
  it('offers no answer with nothing behind it, and still the way to the map', async () => {
    mockApi(OVERLAYS, {
      intents: [{ ...INTENTS[0], count: 0 }],
      zones: [{ ...ZONES[1], count: 0 }],
    })
    const wrapper = await mountHome()

    expect(wrapper.text()).toContain(PRESENTATION)
    expect(wrapper.get('h2').text()).toBe('Che cosa ti va di fare?')
    expect(wrapper.find('a[href^="/cosa-fare"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Le proposte sono in preparazione')
    expect(wrapper.findAll('button').some((b) => b.text().includes('Vai alla mappa'))).toBe(true)
  })

  // «Vai alla mappa» (review PR-21b, never «esplora»: the menu's «Esplora» is
  // on the same screen) puts the question away and leaves today's home: the
  // layers and the list. It can be asked again from where it was.
  it('puts the question away on «Vai alla mappa», and asks it again on request', async () => {
    const wrapper = await mountHome({ attach: true })
    const goToMap = wrapper.findAll('button').find((b) => b.text().includes('Vai alla mappa'))!

    await goToMap.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Scoprire la città')
    expect(wrapper.find('#layer-chiese').exists()).toBe(true)
    expect(wrapper.find('ul[aria-label="Luoghi sulla mappa"]').exists()).toBe(true)
    const askAgain = wrapper.findAll('button').find((b) => b.text() === 'Che cosa ti va di fare?')!
    expect(document.activeElement).toBe(askAgain.element)

    await askAgain.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Scoprire la città')
    expect(document.activeElement?.textContent?.trim()).toBe('Che cosa ti va di fare?')
    expect(document.activeElement?.tagName).toBe('H2')
    wrapper.unmount()
  })

  // Review PR-18: that the archive is alive, said once for all of it, between
  // what the site is and its two other ways in.
  it('says how many cards there are and when the latest changed, under the presentation', async () => {
    const wrapper = await mountHome()

    const text = wrapper.text()
    expect(text).toContain(ARCHIVE_LINE)
    expect(text.indexOf(PRESENTATION)).toBeLessThan(text.indexOf(ARCHIVE_LINE))
    expect(text.indexOf(ARCHIVE_LINE)).toBeLessThan(text.indexOf('Che cosa ti va di fare?'))
  })

  it('prints no line for an empty archive — not «0 schede»', async () => {
    mockApi(OVERLAYS, { stats: { published: 0, last_updated: null } })
    const wrapper = await mountHome()

    expect(wrapper.text()).toContain(PRESENTATION)
    expect(wrapper.text()).not.toMatch(/0 schede|aggiornata/)
  })

  // Between the presentation and the doors, so whichever answered second
  // would push the other down: they are drawn together.
  it('waits for the archive’s line as it waits for the doors', async () => {
    let answerStats: (value: { data: unknown }) => void = () => {}
    mockApi()
    const answerTheRest = vi.mocked(axios.get).getMockImplementation()!
    vi.mocked(axios.get).mockImplementation((url: string, ...rest) =>
      url === '/api/content/stats/'
        ? new Promise((resolve) => {
            answerStats = resolve
          })
        : answerTheRest(url, ...rest),
    )
    const wrapper = await mountHome()

    expect(wrapper.text()).toContain(PRESENTATION)
    expect(wrapper.find('a[href="/cosa-fare?intento=citta"]').exists()).toBe(false)
    expect(wrapper.find('#layer-chiese').exists()).toBe(false)

    answerStats({ data: STATS })
    await flushPromises()

    expect(wrapper.text()).toContain(ARCHIVE_LINE)
    expect(wrapper.find('a[href="/cosa-fare?intento=citta"]').exists()).toBe(true)
    expect(wrapper.find('#layer-chiese').exists()).toBe(true)
  })

  it('opens its doors all the same when the line could not be had', async () => {
    mockApi()
    const answerTheRest = vi.mocked(axios.get).getMockImplementation()!
    vi.mocked(axios.get).mockImplementation((url: string, ...rest) =>
      url === '/api/content/stats/'
        ? Promise.reject(new Error('offline'))
        : answerTheRest(url, ...rest),
    )
    const wrapper = await mountHome()

    expect(wrapper.text()).not.toContain('aggiornata')
    expect(wrapper.find('a[href="/cosa-fare?intento=citta"]').exists()).toBe(true)
  })

  // The question and its answers sit above the layers and the list: until
  // every answer is known nothing under the presentation is drawn, so their
  // arrival cannot push it down.
  it('draws what comes from the API in one piece, once the answers are known', async () => {
    let answerIntents: (value: { data: unknown[] }) => void = () => {}
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/itinerari/intenti/')
        return new Promise((resolve) => {
          answerIntents = resolve
        })
      if (url === '/api/map/features/') return Promise.resolve({ data: FEATURES })
      if (url === '/api/map/zone/') return Promise.resolve({ data: ZONES })
      return Promise.resolve({ data: [] })
    })
    const wrapper = await mountHome()

    expect(wrapper.text()).toContain(PRESENTATION)
    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.find('#layer-chiese').exists()).toBe(false)
    expect(wrapper.find('ul[aria-label="Luoghi sulla mappa"]').exists()).toBe(false)

    answerIntents({ data: INTENTS })
    await flushPromises()

    expect(wrapper.find('a[href="/cosa-fare?intento=citta"]').exists()).toBe(true)
    expect(wrapper.find('#layer-chiese').exists()).toBe(true)
    expect(wrapper.find('ul[aria-label="Luoghi sulla mappa"]').exists()).toBe(true)
  })

  // The v1 reports block was the first text a tourist read on the home
  // (review of 2026-10-22, P-01). For a reader it is not hidden, it is absent:
  // no section, no button, no toggle — and no request the API would refuse.
  it('shows a reader no reports at all', async () => {
    const wrapper = await mountHome()

    expect(wrapper.find('#layer-segnalazioni').exists()).toBe(false)
    expect(wrapper.find('ul[aria-label="Segnalazioni sulla mappa"]').exists()).toBe(false)
    for (const words of ['Segnalazion', 'Segnala un problema', 'cittadini']) {
      expect(wrapper.text()).not.toContain(words)
    }
    const asked = vi.mocked(axios.get).mock.calls.map(([url]) => url)
    expect(asked).not.toContain('/api/reports/map/')
  })

  it('gives a collaborator the reports layer and the way to file one', async () => {
    const wrapper = await mountHome({ signedIn: true })

    expect(wrapper.find('#layer-segnalazioni').exists()).toBe(true)
    expect(wrapper.get('label[for="layer-segnalazioni"]').text()).toContain('(2)')
    expect(wrapper.text()).toContain('Segnala un problema')
  })

  // Filing can start from the account menu, with the section below the fold:
  // wherever it starts, the collaborator is taken to what it asks next.
  it('takes the collaborator to the reports section when filing starts', async () => {
    const wrapper = await mountHome({ signedIn: true, attach: true })

    useMapStore().startPlacing()
    await flushPromises()

    expect(document.activeElement?.textContent?.trim()).toBe('Segnalazioni')
    expect(wrapper.text()).toContain('Clicca sulla mappa nel punto del problema.')
    wrapper.unmount()
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
    const wrapper = await mountHome({ signedIn: true })

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
    const wrapper = await mountHome({ signedIn: true })

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

    expect(wrapper.find('section[aria-label="La mappa di Gaeta"]').exists()).toBe(true)
    // The wide layout's own furniture must not come along for the ride.
    expect(wrapper.find('#layer-chiese').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'MainTitle' }).exists()).toBe(false)
  })

  // M-02: the sheet used to open on «Luoghi sulla mappa · N schede», which
  // says nothing about what the site is. It opens on the presentation, then
  // the wizard's question (review PR-21b, design.md D3's note of 2026-10-25),
  // then the places, one scroll away (D20).
  it('opens the sheet on what the site is, the question, then the places', async () => {
    const wrapper = await mountHome()

    const sheet = wrapper.get('section[aria-label="La mappa di Gaeta"]')
    const text = sheet.text()
    expect(text.indexOf(PRESENTATION)).toBeGreaterThanOrEqual(0)
    // Review PR-18: the archive's line comes between the two.
    expect(text.indexOf(PRESENTATION)).toBeLessThan(text.indexOf(ARCHIVE_LINE))
    expect(text.indexOf(ARCHIVE_LINE)).toBeLessThan(text.indexOf('Che cosa ti va di fare?'))
    expect(text.indexOf('Che cosa ti va di fare?')).toBeLessThan(text.indexOf('Vai alla mappa'))
    expect(text.indexOf('Vai alla mappa')).toBeLessThan(text.indexOf('Luoghi sulla mappa'))
    expect(sheet.findAll('h2').map((h) => h.text())).toEqual([
      'Che cosa ti va di fare?',
      'Luoghi sulla mappa',
    ])
  })

  // «Vai alla mappa» on a phone: the sheet steps down to its lowest stop, so
  // what the reader sees is the map they asked for.
  it('steps the sheet down to the map on «Vai alla mappa», and up again for the question', async () => {
    const wrapper = await mountHome()
    const handle = wrapper.get('section[aria-label="La mappa di Gaeta"] button')
    expect(handle.attributes('aria-expanded')).toBe('true')

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Vai alla mappa'))!
      .trigger('click')
    await flushPromises()
    expect(handle.attributes('aria-expanded')).toBe('false')

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Che cosa ti va di fare?')!
      .trigger('click')
    await flushPromises()
    expect(handle.attributes('aria-expanded')).toBe('true')
  })

  // Review PR-25: the sheet counts places, as its heading says; «schede» is
  // the archive line's word, a few lines above.
  it('counts what it lists as places, not as cards', async () => {
    const wrapper = await mountHome()
    const header = () =>
      wrapper
        .findAll('section[aria-label="La mappa di Gaeta"] h2')
        .find((h) => h.text() === 'Luoghi sulla mappa')!.element.parentElement!

    expect(header().textContent).toContain('2 luoghi')
    expect(header().textContent).not.toContain('schede')

    useMapStore().activeLayers.feste = false
    await flushPromises()
    expect(header().textContent).toContain('1 luogo')
  })

  it('offers no answer in the sheet when there is nothing behind it', async () => {
    mockApi(OVERLAYS, { intents: [], zones: [] })
    const wrapper = await mountHome()

    expect(wrapper.text()).toContain(PRESENTATION)
    expect(wrapper.find('a[href^="/cosa-fare"]').exists()).toBe(false)
    expect(wrapper.find('a[href^="/?"]').exists()).toBe(false)
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

    // Scoped to the places list rather than to the whole sheet: a
    // collaborator's sheet also carries the reports list, a different list
    // with its own label.
    const links = wrapper.findAll('ul[aria-label="Luoghi sulla mappa"] a')
    expect(links.map((link) => link.attributes('href'))).toEqual(['/chiese/c1', '/feste/f1'])
    // c1 has a cover; f1 has none and falls back to a coloured block.
    expect(wrapper.findAll('ul[aria-label="Luoghi sulla mappa"] img')).toHaveLength(1)
  })

  it('carries the reports list in the sheet too, for a collaborator', async () => {
    const wrapper = await mountHome({ signedIn: true })

    const links = wrapper.findAll('ul[aria-label="Segnalazioni sulla mappa"] a')
    expect(links.map((link) => link.attributes('href'))).toEqual(['/reports/r1', '/reports/r2'])
  })

  it('offers the sheet as a keyboard control, not only as a drag', async () => {
    const wrapper = await mountHome()

    // The drag has no keyboard equivalent, so the handle is a real button that
    // cycles the stops (WCAG 2.1.1), same pattern as every map editor here.
    const handle = wrapper.get('section[aria-label="La mappa di Gaeta"] button')
    expect(handle.attributes('aria-expanded')).toBe('true')

    await handle.trigger('click')
    await handle.trigger('click')

    expect(handle.attributes('aria-expanded')).toBe('false')
  })
})
