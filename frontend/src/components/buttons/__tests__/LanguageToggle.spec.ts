import { afterEach, describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import LanguageToggle from '../LanguageToggle.vue'
import { locale, setLocale } from '@/lib/i18n'

// «IT · EN» (review PR-19a): text, not flags; reached by the keyboard as two
// buttons; the current language said by aria-pressed, each named in itself.
const mountToggle = async (path = '/cosa-fare?zona=serapo') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/cosa-fare', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(LanguageToggle, { global: { plugins: [router] } })
  return { wrapper, router }
}

afterEach(() => {
  setLocale('it')
  localStorage.clear()
})

describe('LanguageToggle', () => {
  it('is two buttons, IT and EN, named each in its own language', async () => {
    const { wrapper } = await mountToggle()

    const group = wrapper.get('[role="group"]')
    expect(group.attributes('aria-label')).toBe('Lingua')
    const buttons = wrapper.findAll('button')
    // «IT» shown, «IT, Italiano» heard: the visible word is the name's first.
    expect(buttons.map((button) => button.text())).toEqual(['IT, Italiano', 'EN, English'])
    expect(buttons.map((button) => button.find('.sr-only').text())).toEqual([
      ', Italiano',
      ', English',
    ])
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual([undefined, undefined])
    expect(buttons.map((button) => button.attributes('lang'))).toEqual(['it', 'en'])
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('says which language is on', async () => {
    const { wrapper } = await mountToggle()

    const [it, en] = wrapper.findAll('button')
    expect(it!.attributes('aria-pressed')).toBe('true')
    expect(en!.attributes('aria-pressed')).toBe('false')
  })

  it('switches to English, in the page and in its address, keeping the rest of it', async () => {
    const { wrapper, router } = await mountToggle()

    await wrapper.findAll('button')[1]!.trigger('click')
    await flushPromises()

    expect(locale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(router.currentRoute.value.query).toEqual({ zona: 'serapo', lang: 'en' })
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('Language')
    expect(wrapper.findAll('button')[1]!.attributes('aria-pressed')).toBe('true')
  })

  it('back to Italian takes the language out of the address, which is the canonical one', async () => {
    await setLocale('en')
    const { wrapper, router } = await mountToggle('/cosa-fare?zona=serapo&lang=en')

    await wrapper.findAll('button')[0]!.trigger('click')
    await flushPromises()

    expect(locale.value).toBe('it')
    expect(router.currentRoute.value.query).toEqual({ zona: 'serapo' })
  })

  it('replaces the address rather than adding a step Back would undo', async () => {
    const { wrapper, router } = await mountToggle('/')
    await router.push('/cosa-fare')

    await wrapper.findAll('button')[1]!.trigger('click')
    await flushPromises()
    router.back()
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })
})
