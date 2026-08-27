import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import TypeForm from '../TypeForm.vue'
import {
  chiesaConfig,
  dialettoConfig,
  personaggioConfig,
  ricettaConfig,
} from '@/definitions/typeConfigs'
import type { ContentItem } from '@/definitions/interfaces/Content'

// MapPinsEditor mounts a real Leaflet map, which isn't viable under
// jsdom/Vitest (no map component in this codebase has a unit test either —
// see FesteRouteEditor.vue/ReportsMap.vue) — stubbed here so TypeForm's own
// fields can be tested without it. RichTextEditor is stubbed too, same
// reasoning as FesteForm.spec.ts.
const globalStubs = { MapPinsEditor: true, RichTextEditor: true }

const baseItem: ContentItem = {
  id: '1',
  title: 'Scheda esistente',
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
