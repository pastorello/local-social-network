import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'
import { shallowRef } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import ItineraryDetailView from '../ItineraryDetailView.vue'
import { PANEL_TRAIL, type Trail } from '@/composables/usePanelTrail'
import type Itinerario from '@/definitions/interfaces/Itinerario'
import { useMapStore } from '@/stores/map'

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
      cover: {
        id: '1',
        imageURL: 'http://x/duomo.jpg',
        position: 0,
        caption: 'La facciata',
      },
      excerpt: 'Il Duomo di Gaeta…',
      availability: {
        state: 'on_request',
        hours: 'Il sabato mattina.',
        hours_updated: '2026-03-12',
        keeper: 'Parrocchia',
        keeper_phone: '',
      },
      zones: [{ slug: 'gaeta-medievale', name: 'Gaeta Medievale' }],
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
      cover: null,
      excerpt: 'La processione.',
      availability: null,
      zones: [{ slug: 'porto-salvo', name: 'Porto Salvo' }],
    },
  ],
} as unknown as Itinerario

// The tour, and the three counts its last stop asks for (review PR-7).
const serve = (data: Itinerario, counts = { tours: 2, ricette: 1, citta: 2 }) =>
  vi.mocked(axios.get).mockImplementation(async (url: string) => {
    if (url === '/api/itinerari/intenti/')
      return { data: [{ slug: 'citta', name: 'Scoprire la città', count: counts.citta }] }
    if (url === '/api/itinerari/') return { data: { count: counts.tours } }
    if (url === '/api/ricette/') return { data: { count: counts.ricette } }
    return { data }
  })

const mountAt = async (path: string, attach = false) => {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/itinerari', name: 'itinerarilist', component: stub },
      { path: '/itinerari/:id', name: 'itinerariodetail', component: ItineraryDetailView },
      { path: '/chiese/:id', name: 'chiesedetail', component: stub },
      { path: '/feste/:id', name: 'festedetail', component: stub },
      { path: '/cosa-fare', name: 'cosafare', component: stub },
      { path: '/ricette', name: 'ricettelist', component: stub },
    ],
  })
  router.push(path)
  await router.isReady()
  // What the panel would draw over the page (review PR-23): the view hands it
  // its part of the eyebrow, as RoutePanel provides for it.
  const trail = shallowRef<Trail | null>(null)
  const pinia = createPinia()
  const wrapper = mount(ItineraryDetailView, {
    global: {
      plugins: [pinia, router],
      stubs: { ItineraryForm: true },
      provide: { [PANEL_TRAIL as symbol]: trail },
    },
    attachTo: attach ? document.body : undefined,
  })
  await flushPromises()
  return { wrapper, router, trail, pinia }
}

describe('ItineraryDetailView (spec itinerari.md I7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serve(tour)
  })

  it('reads as an article with its stops in order, and offers to start the tour', async () => {
    const { wrapper } = await mountAt('/itinerari/t1')

    expect(wrapper.get('h1').text()).toBe('Gaeta medievale')
    expect(wrapper.findAll('ol li a').map((a) => a.text())).toEqual(['Duomo', 'Processione'])
    expect(wrapper.text()).toContain('Inizia il tour')
  })

  // Review PR-13: read in its route's narrow panel, written in the editor's.
  it('opens its form in the editor’s shape, and is read in its route’s', async () => {
    const editing = await mountAt('/itinerari/t1?edit=1')
    expect(useMapStore(editing.pinia).panelShape).toBe('editor')
    editing.wrapper.unmount()

    const reading = await mountAt('/itinerari/t1')
    expect(useMapStore(reading.pinia).panelShape).toBeNull()
  })

  it('offers to start before the list of stops, and again under it (review PR-7)', async () => {
    const { wrapper } = await mountAt('/itinerari/t1')

    const html = wrapper.html()
    const starts = [...html.matchAll(/Inizia il tour/g)].map((match) => match.index!)
    expect(starts).toHaveLength(2)
    expect(starts[0]).toBeLessThan(html.indexOf('Le tappe'))
    expect(starts[0]).toBeGreaterThan(html.indexOf('Durata indicativa'))
    expect(starts[1]).toBeGreaterThan(html.indexOf('Processione'))
  })

  it('follows one stop at a time from the URL, with the leg from the previous stop', async () => {
    const { wrapper, router, trail } = await mountAt('/itinerari/t1?tappa=2')

    expect(trail.value?.steps).toEqual([{ label: 'Tappa 2 di 2' }])
    expect(wrapper.get('h1').text()).toBe('Processione')
    expect(wrapper.text()).toContain('Si parte dal porto.')
    const href = new URL(wrapper.get('a[target="_blank"]').attributes('href')!)
    expect(href.searchParams.get('origin')).toBe('41.2,13.5')
    expect(href.searchParams.get('destination')).toBe('41.21,13.57')

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '← Precedente')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.tappa).toBe('1')
  })

  it('tells the stop on its own: its tour and position over the title, cover, opening, access', async () => {
    const { wrapper, trail } = await mountAt('/itinerari/t1?tappa=1')

    // Review PR-23: the panel's eyebrow is «Gaeta medievale · Tappa 1 di 2»,
    // the tour's name the way up to it; the page draws neither under its title.
    expect(trail.value).toEqual({ up: 'Gaeta medievale', steps: [{ label: 'Tappa 1 di 2' }] })
    expect(wrapper.text()).not.toContain('Tappa 1 di 2')
    expect(wrapper.find('h1 + p').exists()).toBe(false)
    expect(wrapper.get('img').attributes('alt')).toBe('La facciata')
    expect(wrapper.text()).toContain('Il Duomo di Gaeta…')
    // ADR-0008: the hours only with the day they were given, never "open".
    expect(wrapper.text()).toContain('Visitare')
    expect(wrapper.text()).toContain('Orari segnalati il 12 marzo 2026')
    expect(wrapper.text().toLowerCase()).not.toContain('aperto')
  })

  it('shows nothing in place of a missing cover, and how to reach a place', async () => {
    const { wrapper } = await mountAt('/itinerari/t1?tappa=2')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('La processione.')
    expect(wrapper.text()).toContain('In autobus dalla stazione.')
    expect(wrapper.text()).not.toContain('Visitare')
  })

  it('moves forward with one primary button and has no "previous" at the first stop', async () => {
    const { wrapper, router } = await mountAt('/itinerari/t1?tappa=1')
    const labels = wrapper.findAll('nav button').map((b) => b.text())

    expect(labels).toEqual(['Tappa successiva →', 'Torna all’itinerario'])
    await wrapper.get('nav button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.tappa).toBe('2')
  })

  it('ends the tour with what comes after it, instead of a next stop', async () => {
    const { wrapper } = await mountAt('/itinerari/t1?tappa=2')

    expect(wrapper.findAll('button').some((b) => b.text().startsWith('Tappa successiva'))).toBe(
      false,
    )
    expect(wrapper.get('h2#' + wrapper.get('section').attributes('aria-labelledby')).text()).toBe(
      'Hai finito il giro',
    )
    const links = wrapper.get('section ul').findAll('a')
    expect(links.map((a) => a.find('span span').text())).toEqual([
      'Un altro itinerario',
      'Cosa c’è qui intorno',
      'Da mangiare',
    ])
    expect(links.map((a) => a.attributes('href'))).toEqual([
      '/itinerari?intento=citta',
      '/cosa-fare?zona=porto-salvo',
      '/ricette',
    ])
  })

  it('promises nothing after the last stop that is not there', async () => {
    const noZone = {
      ...tour,
      stops: tour.stops.map((stop) => ({ ...stop, zones: [] })),
    } as Itinerario
    serve(noZone, { tours: 1, ricette: 0, citta: 1 })
    const { wrapper } = await mountAt('/itinerari/t1?tappa=2')

    expect(wrapper.text()).toContain('Hai finito il giro')
    expect(wrapper.find('section ul').exists()).toBe(false)
  })

  it('keeps focus on the page when the pressed button goes away (WCAG 2.4.3)', async () => {
    const { wrapper } = await mountAt('/itinerari/t1', true)
    const button = (label: string) => wrapper.findAll('button').find((b) => b.text() === label)!

    // "Inizia il tour" disappears with the article: focus goes to the stop.
    await button('Inizia il tour').trigger('click')
    await flushPromises()
    expect(document.activeElement?.textContent?.trim()).toBe('Duomo')

    // The last stop has no "Tappa successiva": focus goes to the stop.
    ;(button('Tappa successiva →').element as HTMLButtonElement).focus()
    await button('Tappa successiva →').trigger('click')
    await flushPromises()
    expect(document.activeElement?.textContent?.trim()).toBe('Processione')

    // The first stop has no "Precedente": focus goes to the stop.
    ;(button('← Precedente').element as HTMLButtonElement).focus()
    await button('← Precedente').trigger('click')
    await flushPromises()
    expect(document.activeElement?.textContent?.trim()).toBe('Duomo')

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
    serve({ ...tour, form: 'raccolta' } as Itinerario)
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
    serve({ ...tour, form: 'raccolta' } as Itinerario)
    const { wrapper } = await mountAt('/itinerari/t1?tappa=1')

    expect(wrapper.get('h1').text()).toBe('Gaeta medievale')
    expect(wrapper.text()).not.toContain('Inizia il tour')
  })
})

// Review PR-16 (P-11): the tour is shared by its own address, a stop by the
// tour's with the stop in it — the link opens where the sender was reading.
describe('ItineraryDetailView’s «Condividi» (review PR-16)', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    serve(tour)
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    // @ts-expect-error — putting jsdom back the way it was found
    delete navigator.clipboard
  })

  const shareButton = (wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) =>
    wrapper.findAll('button').find((b) => b.text().startsWith('Condividi'))

  it('shares the tour from its article, without the stop', async () => {
    const { wrapper } = await mountAt('/itinerari/t1')

    await shareButton(wrapper)!.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/itinerari/t1`)
  })

  it('shares a stop as the stop, beside its way there and its card', async () => {
    const { wrapper } = await mountAt('/itinerari/t1?tappa=2')

    const share = shareButton(wrapper)!
    expect(share.element.textContent?.trim()).toBe('Condividi la tappa')
    expect(share.element.parentElement?.textContent).toContain('Leggi la scheda')
    await share.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/itinerari/t1?tappa=2`)
  })

  it('offers nothing to send from a draft, which opens for nobody else', async () => {
    serve({ ...tour, is_published: false } as Itinerario)

    expect(shareButton((await mountAt('/itinerari/t1')).wrapper)).toBeUndefined()
    expect(shareButton((await mountAt('/itinerari/t1?tappa=1')).wrapper)).toBeUndefined()
  })
})

// Review PR-23 (N-02, N-04): where the reader is, over the title and in the
// window's title.
describe('ItineraryDetailView’s eyebrow and title (review PR-23)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serve(tour)
  })

  it('puts a tour under «Itinerari», each intent a way to the tours that share it', async () => {
    const { trail } = await mountAt('/itinerari/t1')

    expect(trail.value).toEqual({
      steps: [
        { label: 'Scoprire la città', to: { name: 'itinerarilist', query: { intento: 'citta' } } },
      ],
    })
  })

  it('names the window after the tour, and after the stop within it', async () => {
    const { router } = await mountAt('/itinerari/t1')
    expect(document.title).toBe('Gaeta medievale · Itinerari · Vivere Gaeta')

    await router.push('/itinerari/t1?tappa=2')
    await flushPromises()
    expect(document.title).toBe('Processione · Gaeta medievale · Vivere Gaeta')
  })
})
