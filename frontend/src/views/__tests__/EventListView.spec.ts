import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import axios from 'axios'

import EventListView from '../EventListView.vue'
import EnglishMark from '@/components/content/EnglishMark.vue'
import { setLocale } from '@/lib/i18n'
import type { EventItem, Evento } from '@/definitions/interfaces/Evento'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

const evento = (overrides: Partial<Evento>): Evento => ({
  kind: 'evento',
  id: 'e1',
  title: 'Musica sul molo',
  start_date: '2026-10-31',
  start_time: '21:30',
  end_date: '2026-10-31',
  description: '',
  poster: null,
  link: '',
  place: { card: null, label: 'Molo Santa Maria', lat: 41.21, lng: 13.57 },
  zones: [],
  state: 'in_programma',
  is_published: true,
  is_over: false,
  author: { id: 'u1', name: 'Autore', avatarURL: null },
  created_at: '2026-10-25T10:00:00Z',
  updated_at: '2026-10-25T10:00:00Z',
  ...overrides,
})

const mountAt = async (path: string, results: EventItem[]) => {
  vi.mocked(axios.get).mockResolvedValueOnce({
    data: { count: results.length, next: null, results },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/eventi', name: 'eventilist', component: EventListView },
      { path: '/eventi/nuovo', name: 'eventocreate', component: { template: '<div />' } },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(EventListView, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return wrapper
}

// «Gli eventi che conosciamo» (cosa-fare.md CF33; Part −1 D9).
describe('EventListView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'))
    vi.mocked(axios.get).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('is headed by what it is, never «Eventi a Gaeta», and says its order', async () => {
    const wrapper = await mountAt('/eventi', [])

    expect(wrapper.get('h1').text()).toBe('Gli eventi che conosciamo')
    expect(wrapper.text()).toContain('In ordine di data e ora.')
    expect(axios.get).toHaveBeenCalledWith('/api/eventi/')
  })

  it('asks the API for the window in the address, and marks it as the current one', async () => {
    const wrapper = await mountAt('/eventi?finestra=settimana', [])

    expect(axios.get).toHaveBeenCalledWith('/api/eventi/?finestra=settimana')
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('Questa settimana')
  })

  it('strikes a cancelled event through and says so in words (CF28)', async () => {
    const wrapper = await mountAt('/eventi', [evento({ state: 'annullato' })])

    const link = wrapper.get('a[href="/eventi/e1"]')
    expect(link.classes()).toContain('line-through')
    expect(wrapper.text()).toContain('Annullato')
  })

  it('lists a feast’s edition beside the events, leading to the feast', async () => {
    const wrapper = await mountAt('/eventi', [
      {
        kind: 'edizione',
        id: 3,
        title: 'Festa di Porto Salvo',
        festa: 'f1',
        start_date: '2026-11-01',
        end_date: '2026-11-01',
        note: 'Processione a mare',
      },
      evento({}),
    ])

    const rows = wrapper.findAll('li')
    expect(rows[0]!.get('a').attributes('href')).toBe('/feste/f1')
    expect(rows[0]!.text()).toContain('domenica 1 novembre')
    expect(rows[0]!.text()).toContain('Festa')
    expect(rows[1]!.text()).toContain('sabato 31 ottobre, ore 21:30')
  })

  it.each([
    ['/eventi?finestra=oggi', 'Per oggi non ne conosciamo.'],
    ['/eventi?finestra=settimana', 'Per questa settimana non ne conosciamo.'],
    ['/eventi', 'Per ora non ne conosciamo.'],
  ])('says one true sentence when %s is empty (CF33)', async (path, sentence) => {
    const wrapper = await mountAt(path, [])

    expect(wrapper.text()).toContain(sentence)
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('ends with the way to tell the archive what it is missing (CF42)', async () => {
    const wrapper = await mountAt('/eventi', [])

    expect(wrapper.get('a[href="/collabora"]').text()).toBe('Scrivici')
  })

  // Review PR-19b: a feast's edition is its card, which may be read in
  // English; an event is not a card, and has no other language.
  it('marks a feast whose card can be read in English, for a reader in English', async () => {
    await setLocale('en')
    try {
      const wrapper = await mountAt('/eventi', [
        evento({}),
        {
          kind: 'edizione',
          id: 7,
          title: 'Festa di Porto Salvo',
          festa: 'f1',
          has_en: true,
          start_date: '2026-10-31',
          end_date: '2026-10-31',
          note: '',
        } as EventItem,
      ])
      const [event, edition] = wrapper.findAll('li')
      expect(event!.findComponent(EnglishMark).exists()).toBe(false)
      expect(edition!.findComponent(EnglishMark).exists()).toBe(true)
    } finally {
      await setLocale('it')
    }
  })
})
