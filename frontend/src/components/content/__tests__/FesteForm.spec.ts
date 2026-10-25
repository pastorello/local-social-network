import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import axios from 'axios'

import FesteForm from '../FesteForm.vue'
import type Feste from '@/definitions/interfaces/Feste'

vi.mock('axios', () => ({ default: { post: vi.fn(), patch: vi.fn() } }))

const existing = (overrides: Partial<Feste> = {}): Feste => ({
  id: '1',
  title: 'Festa esistente',
  original_title: 'Festa esistente',
  body_html: '<p>Testo</p>',
  author: { id: 'u1', name: 'Autore', avatarURL: null },
  is_published: true,
  recurrence: 'Ogni 9 giugno',
  programme: 'Programma',
  images: [],
  route: [],
  pins: [],
  language: 'it',
  translation_of: null,
  translations: [],
  zones: [],
  editions: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

// The route is drawn on the map under the panel since design.md D19, so the
// form mounts no map any more and needs no map stub. RichTextEditor is
// stubbed: it has its own spec, and its toolbar is not what is tested here.
const globalStubs = { RichTextEditor: true }

describe('FesteForm', () => {
  it('renders the create-mode fields and button copy', () => {
    const wrapper = mount(FesteForm, {
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Crea scheda')
  })

  it('pre-fills fields and shows edit-mode copy when a feste is passed', () => {
    const wrapper = mount(FesteForm, {
      props: { feste: existing() },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    expect((wrapper.find('input[type="text"]').element as HTMLInputElement).value).toBe(
      'Festa esistente',
    )
    expect(wrapper.text()).toContain('Salva modifiche')
  })

  it('emits cancel', async () => {
    const wrapper = mount(FesteForm, {
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    // By its words: since D19 the form opens with its tabs, which are buttons too.
    const cancel = wrapper.findAll('button[type="button"]').find((b) => b.text() === 'Annulla')
    await cancel!.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  // This year's date, typed by hand (cosa-fare.md D9, K2): sent beside the
  // form as JSON, like the route, with the stored edition's id so it keeps
  // its row, and no end for a one-day feast.
  it('sends the editions beside the form, each with its id', async () => {
    vi.mocked(axios.patch).mockResolvedValueOnce({ data: existing() })
    const wrapper = mount(FesteForm, {
      props: {
        feste: existing({
          editions: [{ id: 7, start_date: '2027-08-08', end_date: '2027-08-08', note: 'A mare' }],
        }),
      },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('domenica 8 agosto 2027')

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Aggiungi un’edizione')!
      .trigger('click')
    await wrapper.get('#feste-editions-1-start').setValue('2028-08-13')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const sent = vi.mocked(axios.patch).mock.calls[0]![1] as FormData
    expect(JSON.parse(sent.get('editions') as string)).toEqual([
      { id: 7, start_date: '2027-08-08', end_date: null, note: 'A mare' },
      { id: null, start_date: '2028-08-13', end_date: null, note: '' },
    ])
  })

  it('shows a translation its original’s dates and sends none of its own', async () => {
    vi.mocked(axios.patch).mockResolvedValueOnce({ data: existing() })
    const wrapper = mount(FesteForm, {
      props: {
        feste: existing({
          translation_of: '0',
          editions: [{ id: 7, start_date: '2027-08-08', end_date: '2027-08-09', note: '' }],
        }),
      },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    expect(wrapper.text()).toContain('da domenica 8 agosto 2027 a lunedì 9 agosto 2027')
    expect(wrapper.find('#feste-editions-0-start').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect((vi.mocked(axios.patch).mock.lastCall![1] as FormData).has('editions')).toBe(false)
  })
})
