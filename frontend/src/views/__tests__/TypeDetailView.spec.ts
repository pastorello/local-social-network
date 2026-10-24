import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'
import { shallowRef } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import TypeDetailView from '../TypeDetailView.vue'
import { PANEL_TRAIL, type Trail } from '@/composables/usePanelTrail'
import { fetchCardFirst } from '@/lib/cardFirst'
import { useMapStore } from '@/stores/map'
import {
  chiesaConfig,
  dialettoConfig,
  luogoConfig,
  ricettaConfig,
  type TypeConfig,
} from '@/definitions/typeConfigs'

vi.mock('axios')

const card = (patch: Record<string, unknown>) => ({
  id: 'c1',
  title: 'Santissima Annunziata',
  original_title: 'Santissima Annunziata',
  body_html: '<p>Testo.</p>',
  author: { id: 'a1', name: 'Luca', avatarURL: null },
  created_at: '2026-10-22T10:00:00Z',
  is_published: true,
  images: [],
  language: 'it',
  translation_of: null,
  translations: [],
  pins: [],
  ...patch,
})

const mountWith = async (config: TypeConfig, data: Record<string, unknown>) => {
  vi.mocked(axios.get).mockResolvedValue({ data })
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: `/${config.key}`, name: config.routeNames.list, component: stub },
      { path: `/${config.key}/:id`, name: config.routeNames.detail, component: TypeDetailView },
    ],
  })
  router.push(`/${config.key}/c1`)
  await router.isReady()
  // What the panel would draw over the card (review PR-23).
  const trail = shallowRef<Trail | null>(null)
  const wrapper = mount(TypeDetailView, {
    props: { config },
    global: {
      plugins: [createPinia(), router],
      stubs: { TypeForm: true },
      provide: { [PANEL_TRAIL as symbol]: trail },
    },
  })
  await flushPromises()
  return { wrapper, router, trail }
}

const section = (wrapper: Awaited<ReturnType<typeof mountWith>>['wrapper']) =>
  wrapper
    .findAll('section')
    .find((s) => s.find('h2').exists() && s.get('h2').text() === 'Dove si trova')

describe('TypeDetailView — «Dove si trova» (review PR-3)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('says where a church is and opens the way there in Google Maps', async () => {
    const { wrapper } = await mountWith(
      chiesaConfig,
      card({
        pins: [{ id: 1, lat: 41.2087, lng: 13.5868, label: 'Ingresso' }],
        zones: [{ slug: 'gaeta-medievale', name: 'Gaeta Medievale' }],
      }),
    )

    const where = section(wrapper)!
    expect(where.text()).toContain('Gaeta Medievale')
    expect(where.get('li').text()).toBe('Ingresso')
    const link = where.get('a[target="_blank"]')
    expect(link.text()).toBe('Come arrivarci (apre Google Maps)')
    expect(link.attributes('rel')).toBe('noopener')
    expect(link.attributes('href')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=41.2087%2C13.5868&travelmode=walking',
    )
  })

  it('reads a place’s own «Come arrivarci» with the way there, not among its facts', async () => {
    const { wrapper } = await mountWith(
      luogoConfig,
      card({
        title: 'Spiaggia di Serapo',
        original_title: 'Spiaggia di Serapo',
        genre: 'spiaggia',
        genre_label: 'Spiaggia',
        how_to_get_there: 'A piedi dal centro, dieci minuti.',
        pins: [{ id: 1, lat: 41.2119, lng: 13.5637, label: '' }],
        zones: [{ slug: 'serapo', name: 'Serapo' }],
      }),
    )

    expect(section(wrapper)!.text()).toContain('A piedi dal centro, dieci minuti.')
    const facts = wrapper.get('dl').text()
    expect(facts).toContain('Spiaggia')
    expect(facts).not.toContain('A piedi dal centro')
  })

  it('gives each of several places its own way there', async () => {
    const { wrapper } = await mountWith(
      ricettaConfig,
      card({
        title: 'Tiella',
        original_title: 'Tiella',
        pins: [
          { id: 1, lat: 41.21, lng: 13.57, label: 'Forno Rossi' },
          { id: 2, lat: 41.22, lng: 13.58, label: '' },
        ],
      }),
    )

    const rows = section(wrapper)!.findAll('li')
    expect(rows.map((row) => row.find('span').text())).toEqual(['Forno Rossi', 'Punto 2'])
    expect(
      rows.map((row) => new URL(row.get('a').attributes('href')!).searchParams.get('destination')),
    ).toEqual(['41.21,13.57', '41.22,13.58'])
  })

  it('has no such section for a card with no place, and keeps its facts where they were', async () => {
    const { wrapper } = await mountWith(
      luogoConfig,
      card({ genre: 'spiaggia', genre_label: 'Spiaggia', how_to_get_there: 'In barca.', pins: [] }),
    )

    expect(section(wrapper)).toBeUndefined()
    expect(wrapper.find('a[target="_blank"]').exists()).toBe(false)
    expect(wrapper.get('dl').text()).toContain('In barca.')
  })

  it('has none for a type that has no place at all', async () => {
    const { wrapper } = await mountWith(dialettoConfig, card({ meaning: 'Lustrascarpe.' }))

    expect(section(wrapper)).toBeUndefined()
  })

  it('offers to enlarge the map on a phone, as one more step Back undoes', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { wrapper, router } = await mountWith(
      chiesaConfig,
      card({ pins: [{ id: 1, lat: 41.2087, lng: 13.5868, label: '' }], zones: [] }),
    )

    const enlarge = section(wrapper)!
      .findAll('a')
      .find((a) => a.text() === 'Allarga la mappa')!
    await enlarge.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.mappa).toBe('1')
  })
})

// Review PR-24 (proposal 2, approved 2026-10-23): a place's card opens on a
// line for the reader standing in town, before its text; «Dove si trova»
// keeps the whole of it after.
describe('TypeDetailView — «Dove» over the text (review PR-24)', () => {
  beforeEach(() => vi.clearAllMocks())

  const whereLine = (wrapper: Awaited<ReturnType<typeof mountWith>>['wrapper']) =>
    wrapper.findAll('p').find((p) => p.text().startsWith('Dove'))
  const follows = (first: Element, second: Element) =>
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

  it('opens a church on the way there, under its title and before its text', async () => {
    const { wrapper } = await mountWith(
      chiesaConfig,
      card({
        pins: [{ id: 1, lat: 41.2087, lng: 13.5868, label: '' }],
        zones: [{ slug: 'gaeta-medievale', name: 'Gaeta Medievale' }],
      }),
    )

    const line = whereLine(wrapper)!
    expect(follows(wrapper.get('header').element, line.element)).toBe(true)
    expect(follows(line.element, wrapper.get('.prose').element)).toBe(true)
    expect(line.get('a').attributes('href')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=41.2087%2C13.5868&travelmode=walking',
    )
    // The panel's eyebrow says the zone; the line does not say it twice.
    expect(line.text()).not.toContain('Gaeta Medievale')
  })

  it('reads a place’s first sentence of how to get there, and leaves the rest to «Dove si trova»', async () => {
    const { wrapper } = await mountWith(
      luogoConfig,
      card({
        title: 'Spiaggia di Serapo',
        original_title: 'Spiaggia di Serapo',
        genre: 'spiaggia',
        genre_label: 'Spiaggia',
        how_to_get_there: 'A piedi dal centro, dieci minuti. In auto, parcheggio sulla Flacca.',
        pins: [{ id: 1, lat: 41.2119, lng: 13.5637, label: '' }],
        zones: [{ slug: 'serapo', name: 'Serapo' }],
      }),
    )

    const line = whereLine(wrapper)!
    expect(line.text()).toContain('A piedi dal centro, dieci minuti.')
    expect(line.text()).not.toContain('Flacca')
    expect(section(wrapper)!.text()).toContain(
      'A piedi dal centro, dieci minuti. In auto, parcheggio sulla Flacca.',
    )
  })

  it('has no such line for a place with no pin', async () => {
    const { wrapper } = await mountWith(
      luogoConfig,
      card({ genre: 'spiaggia', genre_label: 'Spiaggia', how_to_get_there: 'In barca.', pins: [] }),
    )

    expect(whereLine(wrapper)).toBeUndefined()
  })

  it('has none for a card that has places rather than being one: a ricetta’s shop', async () => {
    const { wrapper } = await mountWith(
      ricettaConfig,
      card({
        title: 'Tiella',
        original_title: 'Tiella',
        pins: [{ id: 1, lat: 41.21, lng: 13.57, label: 'Forno Rossi' }],
      }),
    )

    expect(whereLine(wrapper)).toBeUndefined()
    // Its way there stays under «Dove si trova».
    expect(section(wrapper)!.find('a[target="_blank"]').exists()).toBe(true)
  })
})

// Review PR-23 (N-02, N-04): the card's type is the panel's way up; the zone
// it is in goes beside it, as the way to what else is there, and the window
// is named after the card.
describe('TypeDetailView — eyebrow and title (review PR-23)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hands the panel the zone the card is in, linked to «Cosa fare»', async () => {
    const { trail } = await mountWith(
      chiesaConfig,
      card({
        pins: [{ id: 1, lat: 41.2087, lng: 13.5868, label: '' }],
        zones: [{ slug: 'gaeta-medievale', name: 'Gaeta Medievale' }],
      }),
    )

    expect(trail.value).toEqual({
      steps: [
        { label: 'Gaeta Medievale', to: { name: 'cosafare', query: { zona: 'gaeta-medievale' } } },
      ],
    })
  })

  it('draws no eyebrow of its own over the title: the panel’s is the one', async () => {
    const { wrapper } = await mountWith(chiesaConfig, card({ zones: [] }))

    // It said «Chiesa» there until 2026-10-23.
    expect(wrapper.get('header').text()).not.toMatch(/chiesa/i)
    expect(wrapper.get('h1').text()).toBe('Santissima Annunziata')
  })

  it('names the window after the card, by its Italian name and its type', async () => {
    await mountWith(
      chiesaConfig,
      card({ title: 'Annunziata', original_title: 'Santissima Annunziata', language: 'en' }),
    )

    expect(document.title).toBe('Santissima Annunziata · Chiese · Vivere Gaeta')
  })

  it('says nothing of a card the URL does not name — the one before it, still loading', async () => {
    const { trail } = await mountWith(chiesaConfig, card({ id: 'altra', zones: [] }))

    expect(trail.value).toBeNull()
  })
})

// Review PR-10 (P-09): the card decides its panel, not its type — and the
// panel is born in that shape, from the card the route brought with it.
describe('TypeDetailView — the panel’s shape (review PR-10)', () => {
  beforeEach(() => vi.clearAllMocks())

  // As the router does it: the card fetched before the page mounts.
  const mountBrought = async (config: TypeConfig, data: Record<string, unknown>, query = '') => {
    vi.mocked(axios.get).mockResolvedValue({ data })
    const stub = { template: '<div />' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: `/${config.key}`, name: config.routeNames.list, component: stub },
        {
          path: `/${config.key}/:id`,
          name: config.routeNames.detail,
          component: stub,
          beforeEnter: fetchCardFirst(config.endpoint),
        },
      ],
    })
    await router.push(`/${config.key}/c1${query}`)
    const wrapper = mount(TypeDetailView, {
      props: { config },
      global: { plugins: [createPinia(), router], stubs: { TypeForm: true } },
    })
    // No flush: what the page is born with.
    return { wrapper, store: useMapStore() }
  }

  it('opens a ricetta sold nowhere wide, from its first render', async () => {
    const { wrapper, store } = await mountBrought(
      ricettaConfig,
      card({ title: 'Tiella', original_title: 'Tiella', pins: [] }),
    )

    expect(store.panelShape).toBe('wide')
    expect(wrapper.get('h1').text()).toBe('Tiella')
    // The card came with the route: the page does not ask again.
    await flushPromises()
    expect(axios.get).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    expect(store.panelShape).toBeNull()
  })

  it('opens a church with its pin narrow, beside the map that shows it', async () => {
    const { store } = await mountBrought(
      chiesaConfig,
      card({ pins: [{ id: 1, lat: 41.2087, lng: 13.5868, label: '' }] }),
    )

    expect(store.panelShape).toBe('narrow')
  })

  // Review PR-13: a form is written in the editor's shape — beside the map,
  // which it draws on — whether or not the card has a place yet.
  it('opens a card without a place in the editor while its form is open: the form draws on the map', async () => {
    const { store } = await mountBrought(ricettaConfig, card({ pins: [] }), '?edit=1')

    expect(store.panelShape).toBe('editor')
  })

  it('leaves a type with no place at all to its route', async () => {
    const { store } = await mountBrought(dialettoConfig, card({ meaning: 'Lustrascarpe.' }))

    expect(store.panelShape).toBeNull()
  })

  it('writes a type with no place at all in the editor too: one shape for writing', async () => {
    const { store } = await mountBrought(
      dialettoConfig,
      card({ meaning: 'Lustrascarpe.' }),
      '?edit=1',
    )

    expect(store.panelShape).toBe('editor')
  })

  it('decides once it has the card, when the route could not bring it', async () => {
    await mountWith(ricettaConfig, card({ pins: [] }))

    expect(useMapStore().panelShape).toBe('wide')
  })
})
