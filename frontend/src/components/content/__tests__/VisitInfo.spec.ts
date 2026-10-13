import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import VisitInfo from '../VisitInfo.vue'
import { emptyAvailability } from '@/lib/availability'
import type { Availability } from '@/definitions/interfaces/Content'

const mountWith = (overrides: Partial<Availability> | null) =>
  mount(VisitInfo, {
    props: { availability: overrides === null ? null : { ...emptyAvailability(), ...overrides } },
  })

// ADR-0008, on the reader's side: nothing known shows nothing; hours always
// carry the day they were reported; nothing ever says a place is open.
describe('VisitInfo', () => {
  it('shows nothing at all when nothing is known', () => {
    expect(mountWith({}).html()).not.toContain('<section')
    expect(mountWith(null).html()).not.toContain('<section')
  })

  it('shows the hours with the day they were reported', () => {
    const wrapper = mountWith({ hours: 'La mattina, 10-12.', hours_updated: '2026-03-12' })

    expect(wrapper.text()).toContain('La mattina, 10-12.')
    expect(wrapper.text()).toContain('Orari segnalati il 12 marzo 2026 — telefona per sicurezza.')
  })

  it('links the keeper’s telephone', () => {
    const wrapper = mountWith({
      keeper: 'Parrocchia della Cattedrale',
      keeper_phone: '0771 462255',
    })

    // As a reader sees it: the browser collapses runs of spaces into one.
    const seen = wrapper.text().replace(/\s+/g, ' ')
    expect(seen).toContain('Chi ha le chiavi: Parrocchia della Cattedrale — 0771 462255')
    expect(wrapper.get('a').attributes('href')).toBe('tel:0771462255')
  })

  it('says how one gets in without ever saying it is open', () => {
    for (const state of ['services', 'on_request', 'works', 'no_door'] as const) {
      const text = mountWith({ state }).text().toLowerCase()
      expect(text.replace("all'aperto", '')).not.toMatch(/apert[oa]/)
      expect(text).not.toContain('ora')
    }
    expect(mountWith({ state: 'services' }).text()).toContain('Si entra solo durante le funzioni.')
  })
})
