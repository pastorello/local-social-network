import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import TypeListView from '../TypeListView.vue'
import CardGrid from '@/components/content/CardGrid.vue'
import { chiesaConfig, itinerarioConfig, luogoConfig } from '@/definitions/typeConfigs'

vi.mock('axios')

const genres = [
  { slug: 'spiaggia', name: 'Spiaggia', name_plural: 'Spiagge', count: 7 },
  { slug: 'museo', name: 'Museo', name_plural: 'Musei', count: 0 },
  { slug: 'castello', name: 'Castello', name_plural: 'Castelli', count: 1 },
]

const emptyPage = { count: 0, next: null, previous: null, results: [] }

const mountAt = async (path: string, config = luogoConfig) => {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/luoghi', name: 'luoghilist', component: stub },
      { path: '/chiese', name: 'chieselist', component: stub },
      { path: '/luoghi/nuovo', name: 'luoghicreate', component: stub },
      { path: '/chiese/nuova', name: 'chiesecreate', component: stub },
      { path: '/luoghi/:id', name: 'luoghidetail', component: stub },
      { path: '/chiese/:id', name: 'chiesedetail', component: stub },
      { path: '/itinerari', name: 'itinerarilist', component: stub },
      { path: '/itinerari/nuovo', name: 'itinerariocreate', component: stub },
      { path: '/itinerari/:id', name: 'itinerariodetail', component: stub },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(TypeListView, {
    props: { config },
    global: { plugins: [createPinia(), router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('TypeListView — the genre filter (spec content.md, luoghi)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation((url: string) =>
      Promise.resolve({ data: url.includes('generi') ? genres : emptyPage }),
    )
  })

  it('offers a heading per genre that has something in it, then the churches beside them', async () => {
    const { wrapper } = await mountAt('/luoghi')

    const nav = wrapper.get('nav[aria-label="Filtra luoghi per genere"]')
    const labels = nav.findAll('a').map((a) => a.text())
    // Musei has no published place, so it is left out rather than shown empty.
    expect(labels).toEqual(['Tutti', 'Spiagge', 'Castelli', 'Chiese'])
    expect(nav.find('a[href="/chiese"]').exists()).toBe(true)
  })

  it('reads the genre from the URL, asks the API for it, and names the page after it', async () => {
    const { wrapper } = await mountAt('/luoghi?genere=spiaggia')

    expect(axios.get).toHaveBeenCalledWith('/api/luoghi/?genere=spiaggia')
    expect(wrapper.get('h1').text()).toBe('Spiagge')
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('Spiagge')
  })

  it('keeps the active genre visible even when it is empty', async () => {
    const { wrapper } = await mountAt('/luoghi?genere=museo')

    expect(wrapper.get('h1').text()).toBe('Musei')
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('Musei')
  })

  it('refetches when the reader picks another genre', async () => {
    const { router } = await mountAt('/luoghi')

    await router.push('/luoghi?genere=castello')
    await flushPromises()

    expect(axios.get).toHaveBeenCalledWith('/api/luoghi/?genere=castello')
  })

  it('shows no filter on a type that has none', async () => {
    const { wrapper } = await mountAt('/chiese', chiesaConfig)

    expect(wrapper.find('nav').exists()).toBe(false)
    expect(axios.get).not.toHaveBeenCalledWith('/api/luoghi/generi/')
  })
})

describe('TypeListView — what it counts', () => {
  it('counts tours as itinerari, not as schede', async () => {
    const tour = {
      id: 't1',
      title: 'Giro',
      is_published: true,
      images: [],
      duration: 'Mezza giornata',
      form: 'percorso',
      stops: [{}, {}, {}],
    }
    vi.mocked(axios.get).mockImplementation((url: string) =>
      Promise.resolve({
        data: url.includes('intenti')
          ? []
          : { count: 1, next: null, previous: null, results: [tour] },
      }),
    )
    const { wrapper } = await mountAt('/itinerari', itinerarioConfig)

    expect(wrapper.text()).toContain('1 itinerario')
    expect(wrapper.text()).not.toContain('1 scheda')
    expect(wrapper.text()).toContain('Mezza giornata · 3 tappe')
  })
})

describe('TypeListView — the line under the title (review PR-6)', () => {
  const page = (results: unknown[]) => ({
    count: results.length,
    next: null,
    previous: null,
    results,
  })

  it('reads «Zona · Genere» on a place, the zone by name from the payload', async () => {
    const luogo = {
      id: 'l1',
      title: 'Spiaggia di Serapo',
      is_published: true,
      images: [],
      genre: 'spiaggia',
      genre_label: 'Spiaggia',
      zones: [{ slug: 'serapo', name: 'Serapo' }],
    }
    vi.mocked(axios.get).mockImplementation((url: string) =>
      Promise.resolve({ data: url.includes('generi') ? genres : page([luogo]) }),
    )
    const { wrapper } = await mountAt('/luoghi')

    expect(wrapper.getComponent(CardGrid).text()).toContain('Serapo · Spiaggia')
  })

  it('says only the genre outside every zone, and only the zone on a church', async () => {
    const luogo = {
      id: 'l2',
      title: 'Faro',
      is_published: true,
      images: [],
      genre_label: 'Punto panoramico',
      zones: [],
    }
    const chiesa = {
      id: 'c1',
      title: 'Santissima Annunziata',
      is_published: true,
      images: [],
      zones: [{ slug: 'gaeta-medievale', name: 'Gaeta Medievale' }],
    }
    vi.mocked(axios.get).mockImplementation((url: string) =>
      Promise.resolve({
        data: url.includes('generi') ? genres : page(url.includes('chiese') ? [chiesa] : [luogo]),
      }),
    )

    const places = (await mountAt('/luoghi')).wrapper.getComponent(CardGrid).text()
    expect(places).toContain('Punto panoramico')
    expect(places).not.toContain('·')

    const churches = (await mountAt('/chiese', chiesaConfig)).wrapper.text()
    expect(churches).toContain('Gaeta Medievale')
    expect(churches).not.toContain('Gaeta Medievale ·')
  })

  it('leaves a tour’s own summary alone — its zones are slugs, not names', async () => {
    const tour = {
      id: 't2',
      title: 'Giro',
      is_published: true,
      images: [],
      duration: 'Un’ora',
      form: 'percorso',
      stops: [{}],
      zones: ['porto-salvo'],
    }
    vi.mocked(axios.get).mockImplementation((url: string) =>
      Promise.resolve({ data: url.includes('intenti') ? [] : page([tour]) }),
    )
    const { wrapper } = await mountAt('/itinerari', itinerarioConfig)

    expect(wrapper.text()).toContain('Un’ora · 1 tappa')
    expect(wrapper.text()).not.toContain('porto-salvo')
  })
})
