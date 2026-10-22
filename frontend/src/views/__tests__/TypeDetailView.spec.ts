import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import TypeDetailView from '../TypeDetailView.vue'
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
  const wrapper = mount(TypeDetailView, {
    props: { config },
    global: { plugins: [createPinia(), router], stubs: { TypeForm: true } },
  })
  await flushPromises()
  return { wrapper, router }
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
