import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import StatusBadge from '../StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders the Italian label for the status', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'acknowledged' } })

    expect(wrapper.text()).toBe('Presa in carico')
  })

  it('colors the badge by status', () => {
    const open = mount(StatusBadge, { props: { status: 'open' } })
    const resolved = mount(StatusBadge, { props: { status: 'resolved' } })

    // ADR-0005: darker shades than the original -500s, needed for >=4.5:1
    // contrast against the badge's white text.
    expect(open.attributes('style')).toContain('rgb(185, 28, 28)')
    expect(resolved.attributes('style')).toContain('rgb(21, 128, 61)')
  })
})
