import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import axios from 'axios'

import MyEvents from '../MyEvents.vue'
import type { Evento } from '@/definitions/interfaces/Evento'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

const evento = (overrides: Partial<Evento>): Evento => ({
  kind: 'evento',
  id: 'e1',
  title: 'Concerto',
  start_date: '2026-10-31',
  start_time: '22:00',
  end_date: '2026-10-31',
  description: '',
  poster: null,
  link: '',
  place: null,
  zones: [],
  state: 'in_programma',
  is_published: true,
  is_over: false,
  author: { id: 'u1', name: 'Autore', avatarURL: null },
  created_at: '2026-10-25T10:00:00Z',
  updated_at: '2026-10-25T10:00:00Z',
  ...overrides,
})

const mountWith = async (results: Evento[]) => {
  vi.mocked(axios.get).mockResolvedValueOnce({ data: { count: results.length, results } })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  const wrapper = mount(MyEvents, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

// A collaborator's events on *Le mie schede* (cosa-fare.md D9, CF34).
describe('MyEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'))
    vi.mocked(axios.get).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('lists them in the API’s order, by when they happen, each with its weekday', async () => {
    const wrapper = await mountWith([
      evento({ id: 'a', title: 'Domani', start_date: '2026-10-26', end_date: '2026-10-26' }),
      evento({
        id: 'b',
        title: 'Ieri',
        start_date: '2026-10-24',
        end_date: '2026-10-24',
        is_over: true,
      }),
    ])

    expect(axios.get).toHaveBeenCalledWith('/api/eventi/mine/?page_size=100')
    const rows = wrapper.findAll('li')
    expect(rows.map((row) => row.find('span a').text())).toEqual(['Domani', 'Ieri'])
    expect(rows[0]!.text()).toContain('lunedì 26 ottobre, ore 22:00')
    expect(rows[1]!.text()).toContain('Passato')
  })

  it('says what is a draft, postponed or called off — called off struck through', async () => {
    const wrapper = await mountWith([
      evento({ id: 'a', title: 'In bozza', is_published: false }),
      evento({ id: 'b', title: 'Rinviato', state: 'rinviato' }),
      evento({ id: 'c', title: 'Annullato', state: 'annullato' }),
    ])

    const rows = wrapper.findAll('li')
    expect(rows[0]!.text()).toContain('Bozza')
    expect(rows[1]!.text()).toContain('Rinviato')
    expect(rows[2]!.get('.line-through').text()).toBe('Annullato')
  })

  it('opens each one’s form, and offers a new one', async () => {
    const wrapper = await mountWith([evento({ id: 'e9', title: 'Concerto' })])

    expect(wrapper.get('a[aria-label="Modifica Concerto"]').attributes('href')).toBe(
      '/eventi/e9/modifica',
    )
    expect(wrapper.get('a[href="/eventi/nuovo"]').text()).toBe('Nuovo evento')
  })

  it('says so when there is none yet', async () => {
    const wrapper = await mountWith([])

    expect(wrapper.text()).toContain('Non hai ancora segnalato nessun evento')
  })
})
