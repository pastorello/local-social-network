import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import TypeListView from '../TypeListView.vue'
import { chiesaConfig, luogoConfig } from '@/definitions/typeConfigs'

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
