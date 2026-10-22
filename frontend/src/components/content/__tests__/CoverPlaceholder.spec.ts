import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import CoverPlaceholder from '../CoverPlaceholder.vue'

// The one placeholder for a card with no cover (spec/design.md D5, review
// PR-6): the archive starts without photographs, so this is what most readers
// meet first.
describe('CoverPlaceholder', () => {
  it('is a pale tint of its layer’s token with the type’s icon, never a hex (D8)', () => {
    const wrapper = mount(CoverPlaceholder, { props: { type: 'luoghi' } })
    const style = wrapper.attributes('style') ?? ''

    // A tint over the page ground, not the saturated colour itself (D7).
    expect(style).toContain('color-mix(in oklab, var(--color-layer-luoghi) 18%, var(--color-page))')
    expect(style).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('says nothing to a screen reader — the title beside it does', () => {
    const wrapper = mount(CoverPlaceholder, { props: { type: 'chiese' } })

    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })

  it('falls back to the unknown grey for a type with no layer, and keeps its icon', () => {
    const wrapper = mount(CoverPlaceholder, { props: { type: 'itinerari' } })

    expect(wrapper.attributes('style')).toContain('var(--color-layer-unknown)')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('is still a tint for a type the SPA does not know yet, just without an icon', () => {
    const wrapper = mount(CoverPlaceholder, { props: { type: 'sconosciuto' } })

    expect(wrapper.attributes('style')).toContain('color-mix')
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
