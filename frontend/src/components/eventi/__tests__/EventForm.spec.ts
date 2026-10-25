import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import axios from 'axios'

import EventForm from '../EventForm.vue'
import type { Evento } from '@/definitions/interfaces/Evento'
import type { MapCardFeature } from '@/definitions/interfaces/MapData'
import { useMapStore } from '@/stores/map'

vi.mock('axios', () => ({ default: { post: vi.fn(), patch: vi.fn() } }))

const feature = (overrides: Partial<MapCardFeature>): MapCardFeature => ({
  id: 'f1',
  type: 'luoghi',
  title: 'Spiaggia di Serapo',
  is_published: true,
  cover: null,
  points: [{ lat: 41.21, lng: 13.56, label: '' }],
  route: [],
  zones: [],
  ...overrides,
})

const evento = (overrides: Partial<Evento> = {}): Evento => ({
  kind: 'evento',
  id: 'e1',
  title: 'Concerto',
  start_date: '2026-10-31',
  start_time: '22:00',
  end_date: '2026-10-31',
  description: '',
  poster: null,
  link: '',
  place: {
    card: { id: 'f1', type: 'luoghi', title: 'Spiaggia di Serapo' },
    label: 'Spiaggia di Serapo',
    lat: 41.21,
    lng: 13.56,
  },
  zones: [],
  state: 'in_programma',
  is_published: true,
  is_over: false,
  author: { id: 'u1', name: 'Autore', avatarURL: null },
  created_at: '2026-10-25T10:00:00Z',
  updated_at: '2026-10-25T10:00:00Z',
  ...overrides,
})

const mountForm = (props: { evento?: Evento } = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useMapStore().features = [
    feature({ id: 'f1' }),
    feature({ id: 'c1', type: 'chiese', title: 'Santissima Annunziata' }),
    feature({ id: 'a1', type: 'attivita', title: 'Bar del molo', is_published: false }),
    feature({ id: 'r1', type: 'ricette', title: 'Tiella' }),
    feature({ id: 'p1', type: 'feste', title: 'Porto Salvo', points: [] }),
  ]
  return mount(EventForm, { props, global: { plugins: [pinia] }, attachTo: document.body })
}

// An event filed from a phone (cosa-fare.md Part −1 D9; CF31, CF34).
describe('EventForm', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset()
    vi.mocked(axios.patch).mockReset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('says the date back in words before saving, weekday and year included', async () => {
    const wrapper = mountForm()

    await wrapper.get('#evento-start-date').setValue('2026-10-31')
    await wrapper.get('#evento-start-time').setValue('22:00')

    expect(wrapper.text()).toContain('Controlla: sabato 31 ottobre 2026, ore 22:00')
  })

  it('offers the archive’s places with a door, by type, a draft marked as one', () => {
    const wrapper = mountForm()

    const groups = wrapper.findAll('#evento-venue optgroup')
    expect(groups.map((group) => group.attributes('label'))).toEqual([
      'Luoghi',
      'Chiese',
      'Attività',
    ])
    expect(wrapper.findAll('#evento-venue option').map((option) => option.text())).toEqual([
      'Scegli il posto',
      'Spiaggia di Serapo',
      'Santissima Annunziata',
      'Bar del molo (bozza)',
    ])
  })

  it('wants a name for a point of its own before anything is sent (CF31)', async () => {
    const wrapper = mountForm()
    await wrapper.get('#evento-title').setValue('Concerto')
    await wrapper.get('#evento-start-date').setValue('2026-10-31')
    await wrapper.get('input[value="point"]').setValue(true)

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Scrivi il nome del posto.')
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('files the event with its place and its poster, in programma', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: evento() })
    const wrapper = mountForm()
    await wrapper.get('#evento-title').setValue('Musica sul molo')
    await wrapper.get('#evento-start-date').setValue('2026-10-31')
    await wrapper.get('#evento-venue').setValue('c1')
    const poster = new File(['locandina'], 'locandina.jpg', { type: 'image/jpeg' })
    const input = wrapper.get('#evento-poster')
    Object.defineProperty(input.element, 'files', { value: [poster] })
    await input.trigger('change')
    await flushPromises()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const [url, sent] = vi.mocked(axios.post).mock.calls[0]! as [string, FormData]
    expect(url).toBe('/api/eventi/')
    expect(sent.get('title')).toBe('Musica sul molo')
    expect(sent.get('end_date')).toBe('')
    expect(JSON.parse(sent.get('place') as string)).toEqual({ card: 'c1' })
    expect(sent.get('poster')).toBe(poster)
    expect(sent.has('state')).toBe(false)
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('offers no way back from a cancelled event (CF28)', () => {
    const wrapper = mountForm({ evento: evento({ state: 'annullato' }) })

    expect(
      wrapper.findAll('input[name="evento-state"]').map((radio) => radio.attributes('value')),
    ).toEqual(['annullato'])
  })

  it('puts what the server refused under the field it names', async () => {
    vi.mocked(axios.patch).mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Dati non validi.',
          fields: { start_date: ['Questa data è già passata.'] },
        },
      },
    })
    const wrapper = mountForm({ evento: evento() })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const error = wrapper.get('#evento-start-date-error')
    expect(error.text()).toBe('Questa data è già passata.')
    expect(wrapper.get('#evento-start-date').attributes('aria-describedby')).toContain(
      'evento-start-date-error',
    )
  })
})
