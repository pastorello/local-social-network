import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'

import ItineraryForm from '../ItineraryForm.vue'
import type Itinerario from '@/definitions/interfaces/Itinerario'

// The stops are picked on the map under the panel (itinerari.md I8), so the
// form mounts no map; RichTextEditor is stubbed as in TypeForm.spec.ts.
vi.mock('axios')

const intents = [
  { slug: 'mare', name: 'Andare al mare', count: 0 },
  { slug: 'citta', name: 'Scoprire la città', count: 1 },
]
const features = [
  {
    id: 'c1',
    type: 'chiese',
    title: 'Duomo',
    cover: null,
    points: [{ lat: 41.2, lng: 13.5, label: '' }],
    route: [],
  },
]

const tour = {
  id: 't1',
  title: 'Gaeta medievale',
  original_title: 'Gaeta medievale',
  body_html: '<p>Un giro.</p>',
  author: { id: 'a1', name: 'Luca', avatarURL: null },
  created_at: '2026-09-18T10:00:00Z',
  is_published: false,
  images: [],
  language: 'it',
  translation_of: null,
  translations: [],
  form: 'percorso',
  duration: 'Un’ora',
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
      point: { lat: 41.2, lng: 13.5, label: '' },
      note: 'Si entra dal lato.',
    },
  ],
} as unknown as Itinerario

const mountForm = async (props: { tour?: Itinerario } = {}) => {
  const wrapper = mount(ItineraryForm, {
    props,
    global: { plugins: [createPinia()], stubs: { RichTextEditor: true } },
  })
  await flushPromises()
  return wrapper
}

const sent = (): FormData => {
  const call = vi.mocked(axios.patch).mock.calls[0] ?? vi.mocked(axios.post).mock.calls[0]
  return call![1] as FormData
}

describe('ItineraryForm (spec itinerari.md I8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation((url: string) =>
      Promise.resolve({ data: url.includes('intenti') ? intents : features }),
    )
    vi.mocked(axios.patch).mockResolvedValue({ data: tour })
    vi.mocked(axios.post).mockResolvedValue({ data: tour })
  })

  it('offers the two forms and the intents, and the path tab only for a percorso', async () => {
    const wrapper = await mountForm()

    expect(wrapper.text()).toContain('Percorso')
    expect(wrapper.text()).toContain('Raccolta')
    expect(wrapper.text()).toContain('Scoprire la città')
    expect(wrapper.find('[role="tab"]#tour-form-tab-tragitto').exists()).toBe(true)

    await wrapper.get('input[type="radio"][value="raccolta"]').setValue()
    expect(wrapper.find('[role="tab"]#tour-form-tab-tragitto').exists()).toBe(false)
  })

  it('sends its stops as cards with their notes, its intents and its form', async () => {
    const wrapper = await mountForm({ tour })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const body = sent()
    expect(axios.patch).toHaveBeenCalledWith(
      '/api/itinerari/t1/',
      expect.any(FormData),
      expect.anything(),
    )
    expect(JSON.parse(body.get('stops') as string)).toEqual([
      { card: 'c1', point_index: null, note: 'Si entra dal lato.' },
    ])
    expect(JSON.parse(body.get('intents') as string)).toEqual(['citta'])
    expect(body.get('form')).toBe('percorso')
    expect(body.get('route')).toBe('[]')
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('sends a translation only its words: the tour is the original’s (T5)', async () => {
    const wrapper = await mountForm({ tour: { ...tour, translation_of: 't0', language: 'en' } })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const body = sent()
    expect(body.get('title')).toBe('Gaeta medievale')
    for (const field of ['stops', 'intents', 'form', 'route']) {
      expect(body.has(field)).toBe(false)
    }
  })

  it('shows a rejected publication on its own tab (I4)', async () => {
    vi.mocked(axios.patch).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          detail: 'Dati non validi.',
          fields: { is_published: ['Una tappa è ancora in bozza.'] },
        },
      },
    })
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    const wrapper = await mountForm({ tour })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('#tour-form-tab-pubblicazione').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('Una tappa è ancora in bozza.')
  })
})
