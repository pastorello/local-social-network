import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'

import TypeForm from '../TypeForm.vue'
import {
  chiesaConfig,
  dialettoConfig,
  libroConfig,
  personaggioConfig,
  ricettaConfig,
} from '@/definitions/typeConfigs'
import type { ContentItem } from '@/definitions/interfaces/Content'

// MapPinsEditor mounts a real Leaflet map, which isn't viable under
// jsdom/Vitest (no map component in this codebase has a unit test either —
// see FesteRouteEditor.vue/ReportsMap.vue) — stubbed here so TypeForm's own
// fields can be tested without it. RichTextEditor is stubbed too, same
// reasoning as FesteForm.spec.ts.
vi.mock('axios')

const globalStubs = { MapPinsEditor: true, RichTextEditor: true }

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

    await wrapper.find('button[type="button"]').trigger('click')

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
