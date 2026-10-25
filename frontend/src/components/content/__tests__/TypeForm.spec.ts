import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'

import TypeForm from '../TypeForm.vue'
import {
  attivitaConfig,
  chiesaConfig,
  dialettoConfig,
  libroConfig,
  luogoConfig,
  personaggioConfig,
  ricettaConfig,
} from '@/definitions/typeConfigs'
import type { ContentItem } from '@/definitions/interfaces/Content'

// The card's place is drawn on the map under the panel since design.md D19, so
// the form mounts no map of its own. RichTextEditor is stubbed, same
// reasoning as FesteForm.spec.ts.
vi.mock('axios')

const globalStubs = { RichTextEditor: true }

const baseItem: ContentItem = {
  id: '1',
  title: 'Scheda esistente',
  original_title: 'Scheda esistente',
  body_html: '<p>Testo</p>',
  author: { id: 'u1', name: 'Autore', avatarURL: null },
  is_published: true,
  images: [],
  language: 'it',
  translation_of: null,
  translations: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe.each([
  ['chiese', chiesaConfig],
  ['ricette', ricettaConfig],
  ['personaggi', personaggioConfig],
  ['dialetto', dialettoConfig],
  ['libri', libroConfig],
  ['luoghi', luogoConfig],
  ['attivita', attivitaConfig],
])('TypeForm (%s)', (_key, config) => {
  it('renders the create-mode fields and button copy', () => {
    const wrapper = mount(TypeForm, {
      props: { config },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Crea scheda')
    config.extraFields.forEach((field) => {
      expect(wrapper.text()).toContain(field.label)
    })
  })

  it('pre-fills the title and shows edit-mode copy when an item is passed', () => {
    const wrapper = mount(TypeForm, {
      props: { config, item: baseItem },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    expect((wrapper.find('input[type="text"]').element as HTMLInputElement).value).toBe(
      'Scheda esistente',
    )
    expect(wrapper.text()).toContain('Salva modifiche')
  })

  it('emits cancel', async () => {
    const wrapper = mount(TypeForm, {
      props: { config },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    // By its words: since D19 the form opens with its tabs, which are buttons too.
    const cancel = wrapper.findAll('button[type="button"]').find((b) => b.text() === 'Annulla')
    await cancel!.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})

describe('TypeForm error wiring (ADR-0005)', () => {
  beforeEach(() => vi.clearAllMocks())

  const submitAndFail = async (fields: Record<string, unknown>) => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { detail: 'Dati non validi.', fields } },
    })

    const wrapper = mount(TypeForm, {
      props: { config: chiesaConfig },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    // The form refuses an empty title or body on its own, so it has to be
    // filled for the request to happen at all — the rejection under test is
    // the server's, not the client's. The editor is stubbed (jsdom), so its
    // model is set the way the real one would.
    await wrapper.get('#type-form-title').setValue('Una chiesa')
    wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', '<p>Testo.</p>')
    await wrapper.vm.$nextTick()

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    return wrapper
  }

  it('puts a rejected field’s message next to that field, and says so in ARIA', async () => {
    const wrapper = await submitAndFail({ title: ['Questo campo non può essere vuoto.'] })

    const input = wrapper.get('#type-form-title')
    expect(wrapper.get('#type-form-title-error').text()).toContain(
      'Questo campo non può essere vuoto.',
    )
    // The two halves ADR-0005 deferred: the input announces itself invalid and
    // points at its message, instead of the message sitting alone at the foot
    // of the form with nothing connecting the two.
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toContain('type-form-title-error')
  })

  it('still shows what has no field of its own', async () => {
    const wrapper = await submitAndFail({})

    expect(wrapper.text()).toContain('Dati non validi.')
  })

  it('leaves a healthy field unmarked', () => {
    const wrapper = mount(TypeForm, {
      props: { config: chiesaConfig },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    expect(wrapper.get('#type-form-title').attributes('aria-invalid')).toBeUndefined()
    expect(wrapper.find('#type-form-title-error').exists()).toBe(false)
  })
})

// A rule with no mechanism behind it is only as good as where it is written.
// The covers decision (2026-09-09) is a rights call nobody can enforce in
// code, so it belongs where a collaborator is about to upload — attached to
// the field, not floating beside it.
describe('the per-type images rule', () => {
  it('tells a book’s author to use the publisher’s cover, on the images field itself', () => {
    const wrapper = mount(TypeForm, {
      props: { config: libroConfig },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    const hint = wrapper.get('#type-form-images-hint')
    expect(hint.text()).toContain('copertina fornita dall’editore')
    expect(wrapper.get('#type-form-images').attributes('aria-describedby')).toContain(
      'type-form-images-hint',
    )
  })

  it('says nothing extra on a type without such a rule', () => {
    const wrapper = mount(TypeForm, {
      props: { config: chiesaConfig },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    expect(wrapper.get('#type-form-images-hint').text()).not.toContain('editore')
  })
})

// luoghi's genre is a choice from an admin-managed list (spec content.md), so
// the form reads its options from the API instead of from the config.
describe('the genre choice (luoghi)', () => {
  const genres = [
    { slug: 'spiaggia', name: 'Spiaggia', name_plural: 'Spiagge', count: 7 },
    { slug: 'castello', name: 'Castello', name_plural: 'Castelli', count: 1 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: genres })
  })

  it('offers the genres the API returns, behind a placeholder that cannot be chosen', async () => {
    const wrapper = mount(TypeForm, {
      props: { config: luogoConfig },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })
    await flushPromises()

    expect(axios.get).toHaveBeenCalledWith('/api/luoghi/generi/')
    const options = wrapper.findAll('#type-form-genre option')
    expect(options.map((option) => option.text())).toEqual([
      'Scegli un genere',
      'Spiaggia',
      'Castello',
    ])
    expect(options[0]!.attributes('disabled')).toBeDefined()
    // The select is labelled like every other field (ADR-0005).
    expect(wrapper.get('label[for="type-form-genre"]').text()).toContain('Genere')
  })

  it('sends the chosen genre as its slug', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { id: 'new' } })
    const wrapper = mount(TypeForm, {
      props: { config: luogoConfig },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })
    await flushPromises()

    await wrapper.get('#type-form-title').setValue('Spiaggia di Serapo')
    wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', '<p>Testo.</p>')
    await wrapper.get('#type-form-genre').setValue('spiaggia')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const body = vi.mocked(axios.post).mock.calls[0]![1] as FormData
    expect(body.get('genre')).toBe('spiaggia')
  })

  it('pre-selects the stored genre when editing', async () => {
    const wrapper = mount(TypeForm, {
      props: { config: luogoConfig, item: { ...baseItem, genre: 'castello' } },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })
    await flushPromises()

    expect((wrapper.get('#type-form-genre').element as HTMLSelectElement).value).toBe('castello')
  })
})

describe('the pins go back with their ids (TD-50)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // A tour stop names a pin by its id; the server keeps a pin's row only when
  // the form sends that id back, so a stop on the second bakery stays there
  // when the first is removed or the second is renamed.
  it('sends each stored pin with its id, after a remove and a rename', async () => {
    vi.mocked(axios.patch).mockResolvedValue({ data: { id: '1' } })
    const item = {
      ...baseItem,
      pins: [
        { id: 11, lat: 41.214, lng: 13.57, label: 'Forno A' },
        { id: 12, lat: 41.215, lng: 13.572, label: 'Forno B' },
      ],
    }
    const wrapper = mount(TypeForm, {
      props: { config: ricettaConfig, item },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    await wrapper.findAll('button[aria-label^="Rimuovi"]')[0]!.trigger('click')
    await wrapper.findAll('input[aria-label^="Nome"]')[0]!.setValue('Forno B, sul corso')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const body = vi.mocked(axios.patch).mock.calls[0]![1] as FormData
    expect(JSON.parse(body.get('pins') as string)).toEqual([
      { id: 12, lat: 41.215, lng: 13.572, label: 'Forno B, sul corso' },
    ])
  })
})

describe('the Visita tab (ADR-0008, cosa-fare.md D7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
  })

  const mountType = (config: typeof chiesaConfig, item?: ContentItem) =>
    mount(TypeForm, {
      props: { config, item },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

  it('appears only on the types with a door', () => {
    expect(mountType(chiesaConfig).find('#type-form-tab-visita').exists()).toBe(true)
    expect(mountType(luogoConfig).find('#type-form-tab-visita').exists()).toBe(true)
    expect(mountType(ricettaConfig).find('#type-form-tab-visita').exists()).toBe(false)
  })

  it('sends what is known about getting in, without a date, and «Se la trovi chiusa»', async () => {
    vi.mocked(axios.patch).mockResolvedValue({ data: { id: '1' } })
    const item = {
      ...baseItem,
      from_outside: '',
      availability: {
        state: 'unknown',
        hours: '',
        hours_updated: '2026-03-12',
        keeper: '',
        keeper_phone: '',
      },
    }
    const wrapper = mountType(chiesaConfig, item)

    await wrapper.get('#type-form-visit-state').setValue('services')
    await wrapper.get('#type-form-visit-hours').setValue('Domenica alle 11.')
    await wrapper.get('#type-form-visit-keeper').setValue('Parrocchia della Cattedrale')
    await wrapper.get('#type-form-visit-phone').setValue('0771 462255')
    await wrapper.get('#type-form-from-outside').setValue('Il campanile si vede dal porto.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const body = vi.mocked(axios.patch).mock.calls[0]![1] as FormData
    expect(JSON.parse(body.get('availability') as string)).toEqual({
      state: 'services',
      hours: 'Domenica alle 11.',
      keeper: 'Parrocchia della Cattedrale',
      keeper_phone: '0771 462255',
    })
    expect(body.get('from_outside')).toBe('Il campanile si vede dal porto.')
  })

  it('offers "no door" to an open-air place and never to a church', () => {
    const values = (config: typeof chiesaConfig) =>
      mountType(config)
        .findAll('#type-form-visit-state option')
        .map((option) => option.attributes('value'))

    expect(values(luogoConfig)).toContain('no_door')
    expect(values(chiesaConfig)).not.toContain('no_door')
    expect(mountType(luogoConfig).find('#type-form-from-outside').exists()).toBe(false)
  })

  it('on a translation, shows them as the original’s and sends only its own words', async () => {
    vi.mocked(axios.patch).mockResolvedValue({ data: { id: '2' } })
    const wrapper = mountType(chiesaConfig, {
      ...baseItem,
      id: '2',
      language: 'en',
      translation_of: '1',
      from_outside: '',
    })

    expect(wrapper.find('#type-form-visit-state').exists()).toBe(false)
    expect(wrapper.text()).toContain('Orari e custode sono quelli della scheda originale')
    await wrapper.get('#type-form-from-outside').setValue('The bell tower.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const body = vi.mocked(axios.patch).mock.calls[0]![1] as FormData
    expect(body.has('availability')).toBe(false)
    expect(body.get('from_outside')).toBe('The bell tower.')
  })
})

// ADR-0010: a business's kind is one of three, closed in code — the select
// offers what the API reads from the model, and nothing to type.
describe('the kind choice (attività)', () => {
  const kinds = [
    { slug: 'beve', name: 'Dove si beve', name_plural: 'Dove si beve', count: 0 },
    { slug: 'mangia', name: 'Dove si mangia', name_plural: 'Dove si mangia', count: 0 },
    { slug: 'compra', name: 'Dove si compra', name_plural: 'Dove si compra', count: 0 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: kinds })
  })

  it('offers the three kinds and no way to write a fourth', async () => {
    const wrapper = mount(TypeForm, {
      props: { config: attivitaConfig },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })
    await flushPromises()

    expect(axios.get).toHaveBeenCalledWith('/api/attivita/kinds/')
    const kind = wrapper.get('#type-form-kind')
    expect(kind.element.tagName).toBe('SELECT')
    expect(kind.findAll('option').map((option) => option.text())).toEqual([
      'Scegli un tipo',
      'Dove si beve',
      'Dove si mangia',
      'Dove si compra',
    ])
    expect(wrapper.get('label[for="type-form-kind"]').text()).toContain('Tipo')
  })
})

describe('the Orari tab of a business (ADR-0008, ADR-0010)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
  })

  it('asks for the hours and nothing else, and sends no way in and no keeper', async () => {
    vi.mocked(axios.patch).mockResolvedValue({ data: { id: '1' } })
    const wrapper = mount(TypeForm, {
      props: { config: attivitaConfig, item: { ...baseItem, kind: 'beve' } },
      global: { plugins: [createPinia()], stubs: globalStubs },
    })

    expect(wrapper.get('#type-form-tab-visita').text()).toBe('Orari')
    expect(wrapper.find('#type-form-visit-state').exists()).toBe(false)
    expect(wrapper.find('#type-form-visit-keeper').exists()).toBe(false)
    expect(wrapper.find('#type-form-visit-phone').exists()).toBe(false)
    expect(wrapper.find('#type-form-from-outside').exists()).toBe(false)

    await wrapper.get('#type-form-visit-hours').setValue('Tutti i giorni dalle 7.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const body = vi.mocked(axios.patch).mock.calls[0]![1] as FormData
    expect(JSON.parse(body.get('availability') as string)).toEqual({
      state: 'unknown',
      hours: 'Tutti i giorni dalle 7.',
      keeper: '',
      keeper_phone: '',
    })
  })
})
