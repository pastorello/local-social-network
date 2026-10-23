import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import FesteForm from '../FesteForm.vue'

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
      props: {
        feste: {
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

    // By its words: since D19 the form opens with its tabs, which are buttons too.
    const cancel = wrapper.findAll('button[type="button"]').find((b) => b.text() === 'Annulla')
    await cancel!.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
