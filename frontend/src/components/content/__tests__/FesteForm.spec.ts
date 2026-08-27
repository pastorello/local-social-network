import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import FesteForm from '../FesteForm.vue'

// FesteRouteEditor mounts a real Leaflet map, which isn't viable under
// jsdom/Vitest (no other map component in this codebase has a unit test
// either — see ReportsMap.vue) — stubbed here so FesteForm's own fields and
// create/edit copy can be tested without it. RichTextEditor is stubbed too:
// it has its own spec, and its toolbar buttons would otherwise be the first
// `button[type="button"]` this file's selectors find.
const globalStubs = { FesteRouteEditor: true, RichTextEditor: true }

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
      props: {
        feste: {
          id: '1',
          title: 'Festa esistente',
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
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      },
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

    await wrapper.find('button[type="button"]').trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
