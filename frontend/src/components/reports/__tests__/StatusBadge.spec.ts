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

    expect(open.attributes('style')).toContain('rgb(239, 68, 68)')
    expect(resolved.attributes('style')).toContain('rgb(34, 197, 94)')
  })
})
