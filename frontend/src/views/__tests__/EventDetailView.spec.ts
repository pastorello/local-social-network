import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import axios from 'axios'

import EventDetailView from '../EventDetailView.vue'
import type { Evento } from '@/definitions/interfaces/Evento'
import { useMapStore } from '@/stores/map'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

const evento = (overrides: Partial<Evento> = {}): Evento => ({
  kind: 'evento',
  id: 'e1',
  title: 'Musica sul molo',
  start_date: '2026-10-31',
  start_time: '21:30',
  end_date: '2026-10-31',
  description: 'Porta una sedia.',
  poster: '/media/event_posters/locandina.jpg',
  link: 'https://www.prolocogaeta.example/programma',
  place: {
    card: { id: 'l1', type: 'luoghi', title: 'Molo Santa Maria' },
    label: 'Molo Santa Maria',
    lat: 41.21,
    lng: 13.57,
  },
  zones: [{ slug: 'gaeta-medievale', name: 'Gaeta Medievale' }],
  state: 'in_programma',
  is_published: true,
  is_over: false,
  author: { id: 'u1', name: 'Autore', avatarURL: null },
  created_at: '2026-10-25T10:00:00Z',
  updated_at: '2026-10-25T10:00:00Z',
  ...overrides,
})

const mountWith = async (data: Evento) => {
  vi.mocked(axios.get).mockResolvedValueOnce({ data })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/eventi', name: 'eventilist', component: { template: '<div />' } },
      { path: '/eventi/:id', name: 'eventodetail', component: EventDetailView },
      { path: '/eventi/:id/modifica', name: 'eventoedit', component: { template: '<div />' } },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  })
  await router.push(`/eventi/${data.id}`)
  const wrapper = mount(EventDetailView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
}

// An event's own page (cosa-fare.md Part −1 D9; CF28, CF32, CF34).
describe('EventDetailView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'))
    vi.mocked(axios.get).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('says when with its weekday, where, and where to confirm it', async () => {
    const wrapper = await mountWith(evento())

    expect(axios.get).toHaveBeenCalledWith('/api/eventi/e1/')
    expect(wrapper.get('h1').text()).toBe('Musica sul molo')
    expect(wrapper.text()).toContain('sabato 31 ottobre, ore 21:30')
    expect(wrapper.get('a[href="/luoghi/l1"]').text()).toBe('Molo Santa Maria')
    const source = wrapper.get('a[href="https://www.prolocogaeta.example/programma"]')
    expect(source.text()).toBe('prolocogaeta.example')
    expect(source.attributes('rel')).toBe('noopener')
    expect(wrapper.text()).toContain('Porta una sedia.')
  })

  it('shows the map where it is held, the venue’s own pin', async () => {
    await mountWith(evento())

    expect(useMapStore().focus).toEqual({
      id: 'l1',
      type: 'luoghi',
      points: [{ lat: 41.21, lng: 13.57, label: 'Molo Santa Maria' }],
      route: [],
    })
  })

  it('says first, in words, that a cancelled event is not happening (CF28)', async () => {
    const wrapper = await mountWith(evento({ state: 'annullato' }))

    const first = wrapper.get('article > p')
    expect(first.text()).toBe('Annullato: questo evento non si tiene.')
    expect(first.classes()).toContain('text-event-cancelled')
  })

  it('keeps a past event readable, and says it is past (CF26)', async () => {
    const wrapper = await mountWith(evento({ is_over: true }))

    expect(wrapper.text()).toContain('È già passato')
  })

  it('names a point of its own, with no link, and offers the way there', async () => {
    const wrapper = await mountWith(
      evento({ place: { card: null, label: 'Piazza XIX Maggio', lat: 41.2, lng: 13.5 } }),
    )

    expect(wrapper.text()).toContain('Piazza XIX Maggio')
    expect(wrapper.find('a[href^="/luoghi"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Come arrivarci')
  })

  it('opens the poster from a button named after the event', async () => {
    const wrapper = await mountWith(evento())

    expect(
      wrapper.find('button[aria-label="Ingrandisci la locandina di Musica sul molo"]').exists(),
    ).toBe(true)
  })
})
