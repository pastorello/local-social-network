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

const mountSwitch = (translations: TranslationRef[]) =>
  mount(LanguageSwitch, {
    props: { translations, originalId: '1', detailRouteName: 'chiesedetail' },
    global: { plugins: [makeRouter()] },
  })

describe('LanguageSwitch', () => {
  it('renders nothing when there are no translations', () => {
    expect(mountSwitch([]).find('nav').exists()).toBe(false)
  })

  // Review PR-19b (translations.md T10): a card is read in the reader's
  // language at its original's address, so the switch names the language on
  // that address — never the translation's own — and the router switches.
  it("leads to the original's address in the other language, by its name", () => {
    const link = mountSwitch([
      { id: '2', language: 'en', title: 'English version', is_published: true },
    ]).find('nav a')

    expect(link.text()).toBe('Inglese')
    expect(link.attributes('href')).toBe('/chiese/1?lang=en')
  })

  it('leads back to the Italian from the English version', () => {
    const link = mountSwitch([
      { id: '1', language: 'it', title: 'Versione italiana', is_published: true },
    ]).find('nav a')

    expect(link.text()).toBe('Italiano')
    expect(link.attributes('href')).toBe('/chiese/1?lang=it')
  })

  it("offers no draft: an author opens their own from the card's controls", () => {
    expect(
      mountSwitch([{ id: '2', language: 'en', title: 'Bozza', is_published: false }])
        .find('nav')
        .exists(),
    ).toBe(false)
  })
})
