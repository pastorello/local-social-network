import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createMemoryHistory, createRouter } from 'vue-router'

import WelcomeView from '../WelcomeView.vue'

vi.mock('axios')

const mountWelcome = async () => {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: stub },
      { path: '/benvenuto', component: stub },
      { path: '/itinerari', name: 'itinerarilist', component: stub },
    ],
  })
  router.push('/benvenuto')
  await router.isReady()
  const wrapper = mount(WelcomeView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('WelcomeView — the address on a B&B’s card (spec itinerari.md I6)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks one question and offers only the intents that lead to a tour', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: [
        { slug: 'mare', name: 'Andare al mare', description: 'Le spiagge', count: 1 },
        { slug: 'mangiare', name: 'Mangiare bene', count: 0 },
        { slug: 'citta', name: 'Scoprire la città', count: 2 },
      ],
    })
    const wrapper = await mountWelcome()

    expect(wrapper.get('h1').text()).toBe('Che cosa ti va di fare?')
    const hrefs = wrapper.findAll('li a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['/itinerari?intento=mare', '/itinerari?intento=citta'])
    expect(wrapper.text()).toContain('2 itinerari')
    expect(wrapper.text()).toContain('Le spiagge')
    expect(wrapper.find('a[href="/"]').text()).toBe('Oppure esplora la mappa')
  })

  it('says the tours are coming rather than showing an empty list', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    const wrapper = await mountWelcome()

    expect(wrapper.text()).toContain('Gli itinerari sono in preparazione')
  })
})
