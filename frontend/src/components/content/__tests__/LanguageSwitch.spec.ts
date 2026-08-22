import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import LanguageSwitch from '../LanguageSwitch.vue'
import type { TranslationRef } from '@/definitions/interfaces/Content'

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/chiese/:id', name: 'chiesedetail', component: stub }],
  })

describe('LanguageSwitch', () => {
  it('renders nothing when there are no translations', () => {
    const wrapper = mount(LanguageSwitch, {
      props: { translations: [], detailRouteName: 'chiesedetail' },
      global: { plugins: [makeRouter()] },
    })

    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('links to each translation by its language label', () => {
    const translations: TranslationRef[] = [
      { id: '2', language: 'en', title: 'English version', is_published: true },
    ]

    const wrapper = mount(LanguageSwitch, {
      props: { translations, detailRouteName: 'chiesedetail' },
      global: { plugins: [makeRouter()] },
    })

    const link = wrapper.find('nav a')
    expect(link.text()).toBe('Inglese')
    expect(link.attributes('href')).toBe('/chiese/2')
  })
})
