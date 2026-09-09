import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'

import CardArticle from '../CardArticle.vue'

const author = { id: 'u1', name: 'Autore', avatarURL: null }

const mountArticle = (props: Record<string, unknown>) =>
  mount(CardArticle, {
    props: {
      title: 'Santuario della Montagna Spaccata',
      bodyHtml: '<p>Testo</p>',
      author,
      createdAt: '2026-01-01T00:00:00Z',
      isPublished: true,
      images: [],
      translations: [],
      typeLabel: 'chiesa',
      detailRouteName: 'chiesedetail',
      backTo: { name: 'chieselist', label: 'chiese' },
      ...props,
    },
    global: { stubs: { RouterLink: RouterLinkStub, LanguageSwitch: true, UserAvatar: true } },
  })

// The decision of 2026-09-09: the Italian name is the identity, because that
// is what the signs in Gaeta say; the translated name is a subtitle under it.
describe('CardArticle', () => {
  it('shows the Italian name as the heading and the translated name under it', () => {
    const wrapper = mountArticle({
      subtitle: 'Sanctuary of the Split Mountain',
      language: 'en',
    })

    expect(wrapper.find('h1').text()).toBe('Santuario della Montagna Spaccata')
    expect(wrapper.text()).toContain('Sanctuary of the Split Mountain')
  })

  it('marks the heading Italian and the article English, so a screen reader switches voice', () => {
    const wrapper = mountArticle({
      subtitle: 'Sanctuary of the Split Mountain',
      language: 'en',
    })

    // WCAG 3.1.2 (Language of Parts): the document is lang="it", so an
    // English card has to say so, and its Italian heading has to say so back.
    expect(wrapper.find('article').attributes('lang')).toBe('en')
    expect(wrapper.find('h1').attributes('lang')).toBe('it')
  })

  it('has no subtitle on an original', () => {
    const wrapper = mountArticle({ language: 'it' })

    expect(wrapper.find('h1').text()).toBe('Santuario della Montagna Spaccata')
    expect(wrapper.findAll('p').some((p) => p.text().includes('Sanctuary'))).toBe(false)
  })
})
