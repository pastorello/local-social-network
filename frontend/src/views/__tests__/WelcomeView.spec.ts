import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createMemoryHistory, createRouter } from 'vue-router'

import WelcomeView from '../WelcomeView.vue'

vi.mock('axios')

// One answer per endpoint: the intents, and the zones with their counts.
const answer = (intents: unknown[], zones: unknown[] = []) =>
  vi.mocked(axios.get).mockImplementation(async (url: string) => ({
    data: url === '/api/map/zone/' ? zones : intents,
  }))

const mountWelcome = async () => {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: stub },
      { path: '/benvenuto', component: stub },
      { path: '/itinerari', name: 'itinerarilist', component: stub },
      { path: '/cosa-fare', name: 'cosafare', component: stub },
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
    answer([
      { slug: 'mare', name: 'Andare al mare', description: 'Le spiagge', count: 1 },
      { slug: 'mangiare', name: 'Mangiare bene', count: 0 },
      { slug: 'citta', name: 'Scoprire la città', count: 2 },
    ])
    const wrapper = await mountWelcome()

    expect(wrapper.get('h1').text()).toBe('Che cosa ti va di fare?')
    const hrefs = wrapper.findAll('li a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['/itinerari?intento=mare', '/itinerari?intento=citta'])
    expect(wrapper.text()).toContain('2 itinerari')
    expect(wrapper.text()).toContain('Le spiagge')
    expect(wrapper.find('a[href="/"]').text()).toBe('Oppure esplora la mappa')
  })

  it('says the tours are coming rather than showing an empty list', async () => {
    answer([])
    const wrapper = await mountWelcome()

    expect(wrapper.text()).toContain('Gli itinerari sono in preparazione')
  })

  // spec cosa-fare.md Part −1, D8: no door onto an empty room.
  it('offers «Cosa si può fare qui» only once a zone has a published place', async () => {
    answer([], [{ slug: 'serapo', name: 'Serapo', count: 0 }])
    const empty = await mountWelcome()
    expect(empty.find('a[href="/cosa-fare"]').exists()).toBe(false)

    answer([], [{ slug: 'serapo', name: 'Serapo', count: 2 }])
    const open = await mountWelcome()
    expect(open.get('a[href="/cosa-fare"]').text()).toContain("Oppure guarda cosa c'è in una zona")
  })
})
