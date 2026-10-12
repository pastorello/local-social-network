import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import StatusBadge from '../StatusBadge.vue'
import { STATUS_META } from '@/lib/reportStatus'
import type { ReportStatus } from '@/definitions/interfaces/Report'

// The shades and labels come from STATUS_META rather than literals here: when
// ADR-0005's contrast pass changed the shades, the literals this file used to
// carry had to be rewritten by hand (TD-48). What the test pins is that the
// badge shows what the module says, for every status, rejected included.
const STATUSES = Object.keys(STATUS_META) as ReportStatus[]

// The browser normalises a hex colour to rgb(); compare like with like.
const asRendered = (color: string) => {
  const probe = document.createElement('span')
  probe.style.backgroundColor = color
  return probe.style.backgroundColor
}

describe('StatusBadge', () => {
  it.each(STATUSES)('shows the Italian label for %s', (status) => {
    const wrapper = mount(StatusBadge, { props: { status } })

    expect(wrapper.text()).toBe(STATUS_META[status].label)
  })

  it.each(STATUSES)('colours %s with its own shade', (status) => {
    const wrapper = mount(StatusBadge, { props: { status } })

    // No stylesheet in jsdom, so the token falls back to the module's value.
    expect((wrapper.element as HTMLElement).style.backgroundColor).toBe(
      asRendered(STATUS_META[status].fallback),
    )
  })

  it('gives every status a different shade', () => {
    const shades = new Set(STATUSES.map((status) => STATUS_META[status].fallback))
    expect(shades.size).toBe(STATUSES.length)
  })
})
