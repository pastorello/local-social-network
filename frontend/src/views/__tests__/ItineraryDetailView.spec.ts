import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import ItineraryDetailView from '../ItineraryDetailView.vue'
import type Itinerario from '@/definitions/interfaces/Itinerario'

vi.mock('axios')

const tour = {
  id: 't1',
  title: 'Gaeta medievale',
  original_title: 'Gaeta medievale',
  body_html: '<p>Un giro.</p>',
  author: { id: 'a1', name: 'Luca', avatarURL: null },
  created_at: '2026-09-18T10:00:00Z',
  is_published: true,
  images: [],
  language: 'it',
  translation_of: null,
  translations: [],
  form: 'percorso',
  duration: 'Mezza giornata',
  intents: ['citta'],
  intent_labels: ['Scoprire la città'],
  route: [],
  stops: [
    {
      card: 'c1',
      type: 'chiese',
      title: 'Duomo',
      is_published: true,
      point_index: null,
      point: { lat: 41.2, lng: 13.5 },
      places: [{ lat: 41.2, lng: 13.5, label: '' }],
      how_to_get_there: '',
      note: '',
    },
    {
      card: 'c2',
      type: 'feste',
      title: 'Processione',
      is_published: true,
      point_index: null,
      point: { lat: 41.21, lng: 13.57 },
      places: [
        { lat: 41.21, lng: 13.57, label: 'Forno A' },
        { lat: 41.22, lng: 13.58, label: 'Forno B' },
      ],
      how_to_get_there: 'In autobus dalla stazione.',
      note: 'Si parte dal porto.',
    },
  ],
} as unknown as Itinerario

const mountAt = async (path: string, attach = false) => {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/itinerari', name: 'itinerarilist', component: stub },
      { path: '/itinerari/:id', name: 'itinerariodetail', component: ItineraryDetailView },
      { path: '/chiese/:id', name: 'chiesedetail', component: stub },
      { path: '/feste/:id', name: 'festedetail', component: stub },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(ItineraryDetailView, {
    global: { plugins: [createPinia(), router], stubs: { ItineraryForm: true } },
    attachTo: attach ? document.body : undefined,
  })
  await flushPromises()
  return { wrapper, router }
}

describe('ItineraryDetailView (spec itinerari.md I7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: tour })
  })

  it('reads as an article with its stops in order, and offers to start the tour', async () => {
    const { wrapper } = await mountAt('/itinerari/t1')

    expect(wrapper.get('h1').text()).toBe('Gaeta medievale')
    expect(wrapper.findAll('ol li a').map((a) => a.text())).toEqual(['Duomo', 'Processione'])
    expect(wrapper.text()).toContain('Inizia il tour')
  })

  it('follows one stop at a time from the URL, with the leg from the previous stop', async () => {
    const { wrapper, router } = await mountAt('/itinerari/t1?tappa=2')

    expect(wrapper.text()).toContain('Tappa 2 di 2')
    expect(wrapper.get('h1').text()).toBe('Processione')
    expect(wrapper.text()).toContain('Si parte dal porto.')
    const href = new URL(wrapper.get('a[target="_blank"]').attributes('href')!)
    expect(href.searchParams.get('origin')).toBe('41.2,13.5')
    expect(href.searchParams.get('destination')).toBe('41.21,13.57')

    const next = wrapper.findAll('button').find((b) => b.text().startsWith('Tappa successiva'))!
    expect(next.attributes('disabled')).toBeDefined()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '← Tappa precedente')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.tappa).toBe('1')
  })

  it('keeps focus on the page when the pressed button goes away (WCAG 2.4.3)', async () => {
    const { wrapper } = await mountAt('/itinerari/t1', true)
    const button = (label: string) => wrapper.findAll('button').find((b) => b.text() === label)!

    // "Inizia il tour" disappears with the article: focus goes to the stop.
    await button('Inizia il tour').trigger('click')
    await flushPromises()
    expect(document.activeElement?.textContent?.trim()).toBe('Duomo')

    // The last "Tappa successiva" disables itself: focus goes to the stop.
    ;(button('Tappa successiva →').element as HTMLButtonElement).focus()
    await button('Tappa successiva →').trigger('click')
    await flushPromises()
    expect(document.activeElement?.textContent?.trim()).toBe('Processione')

    // Back to the article: focus goes to "Inizia il tour" again.
    await button('Torna all’itinerario').trigger('click')
    await flushPromises()
    expect(document.activeElement?.textContent?.trim()).toBe('Inizia il tour')
    wrapper.unmount()
  })

  it('says what each stop is, under its title', async () => {
    const { wrapper } = await mountAt('/itinerari/t1')

    expect(wrapper.text()).toContain('Chiesa')
    expect(wrapper.text()).toContain('Festa')
  })

  it('in a raccolta, gives every place of a stop its own way there', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { ...tour, form: 'raccolta' } })
    const { wrapper } = await mountAt('/itinerari/t1')

    const portami = wrapper
      .findAll('a[target="_blank"]')
      .filter((a) => a.text().startsWith('Portami'))
    expect(portami).toHaveLength(3)
    const toForno = new URL(portami[1]!.attributes('href')!)
    expect(toForno.searchParams.get('destination')).toBe('41.21,13.57')
    // Not necessarily on foot: the mode is Google's to choose.
    expect(toForno.searchParams.has('travelmode')).toBe(false)
    // The accessible name keeps its space: "Portami a Forno A", not "Portamia".
    expect(portami[1]!.element.textContent?.trim()).toBe('Portami a Forno A (apre Google Maps)')
    expect(wrapper.text()).toContain('In autobus dalla stazione.')
  })

  it('in a percorso, leaves the way there to the guided mode', async () => {
    const { wrapper } = await mountAt('/itinerari/t1')

    expect(wrapper.findAll('a').some((a) => a.text().startsWith('Portami'))).toBe(false)
  })

  it('does not guide a raccolta: it has no order to follow', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { ...tour, form: 'raccolta' } })
    const { wrapper } = await mountAt('/itinerari/t1?tappa=1')

    expect(wrapper.get('h1').text()).toBe('Gaeta medievale')
    expect(wrapper.text()).not.toContain('Inizia il tour')
  })
})
