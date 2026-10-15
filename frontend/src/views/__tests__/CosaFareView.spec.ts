import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import CosaFareView from '../CosaFareView.vue'
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

const FEATURES = [
  feature({ id: 'l1', title: 'Spiaggia di Serapo', genre: 'spiaggia', zones: ['serapo'] }),
  feature({ id: 'l2', title: 'Belvedere', genre: 'punto-panoramico', zones: ['serapo'] }),
  feature({ id: 'c1', type: 'chiese', title: 'Annunziata', zones: ['serapo'], access: 'services' }),
  feature({ id: 'c2', type: 'chiese', title: 'Duomo', zones: ['gaeta-medievale'] }),
  feature({ id: 'l3', title: 'Arenauta', genre: 'spiaggia', zones: [] }),
  feature({ id: 'f1', type: 'feste', title: 'Porto Salvo', zones: ['serapo'] }),
  feature({ id: 'r1', type: 'ricette', title: 'Tiella', zones: ['serapo'] }),
]

const ANSWERS: Record<string, unknown> = {
  '/api/map/zone/': [
    { slug: 'serapo', name: 'Serapo', count: 3 },
    { slug: 'gaeta-medievale', name: 'Gaeta Medievale', count: 1 },
    { slug: 'monte-orlando', name: 'Monte Orlando', count: 0 },
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
      { id: 't1', title: 'Giro di Serapo', zones: ['serapo'] },
      { id: 't2', title: 'Giro del centro', zones: ['gaeta-medievale'] },
    ],
  },
  '/api/feste/': { results: [{ id: 'f1', title: 'Porto Salvo', recurrence: 'Ogni 9 agosto' }] },
  '/api/ricette/': {
    results: [
      { id: 'r2', title: 'Zuppa' },
      { id: 'r1', title: 'Tiella' },
    ],
  },
}

const mountAt = async (query: Record<string, string> = {}) => {
  setActivePinia(createPinia())
  const store = useMapStore()
  store.features = FEATURES
  store.loaded = true
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/cosa-fare', name: 'cosafare', component: CosaFareView },
      { path: '/:rest(.*)*', name: 'itinerariodetail', component: stub },
    ],
  })
  await router.push({ path: '/cosa-fare', query })
  await router.isReady()
  const wrapper = mount(CosaFareView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, store, router }
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

    const headings = wrapper.findAll('h2').map((h) => h.text())
    expect(headings).toEqual([
      'Andare al mare',
      'Mangiare',
      'Scoprire la città',
      'Camminare',
      'Itinerari che passano di qui',
      'Le feste di questa zona',
    ])
    expect(wrapper.text()).toContain('In ordine alfabetico.')
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
  })

  it('has the map draw exactly the zone’s places and feste, and lets go on leaving', async () => {
    const { wrapper, store } = await mountAt({ zona: 'serapo' })

    expect([...(store.restrictTo ?? [])].sort()).toEqual(['c1', 'f1', 'l1', 'l2'])

    wrapper.unmount()
    expect(store.restrictTo).toBeNull()
  })
})
