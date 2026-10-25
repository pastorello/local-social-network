import { afterEach, describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import EnglishMark from '../EnglishMark.vue'
import { setLocale } from '@/lib/i18n'

// Review PR-19b (decision 5 of 2026-10-22): «EN» beside a card that can be
// read in English, for a reader in English — with a name that says so.
describe('EnglishMark', () => {
  afterEach(() => setLocale('it'))

  it('says nothing to a reader in Italian, for whom every card is in its language', () => {
    expect(mount(EnglishMark).html()).toBe('<!--v-if-->')
  })

  it('shows «EN» to the eye and says what it means to a screen reader and on hover', async () => {
    await setLocale('en')
    const mark = mount(EnglishMark)

    expect(mark.attributes('lang')).toBe('en')
    expect(mark.attributes('title')).toBe('Available in English')
    expect(mark.get('[aria-hidden="true"]').text()).toBe('EN')
    expect(mark.get('.sr-only').text()).toBe(', Available in English')
  })
})
