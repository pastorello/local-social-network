import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import WhereLine from '../WhereLine.vue'

const place = { lat: 41.2119, lng: 13.5637 }
const text = (wrapper: ReturnType<typeof mount>) => wrapper.text().replace(/\s+/g, ' ')

// Review PR-24 (proposal 2, approved 2026-10-23): a place's card opens on one
// line for the reader standing in town — how to get there, and the way there.
describe('WhereLine', () => {
  it('reads the first sentence of how to get there, then the way there', () => {
    const wrapper = mount(WhereLine, {
      props: {
        place,
        howToGetThere: 'A piedi dal centro, dieci minuti.\nIn auto, parcheggio sulla Flacca.',
      },
    })

    expect(text(wrapper)).toBe(
      'Dove A piedi dal centro, dieci minuti. Come arrivarci (apre Google Maps)',
    )
    expect(wrapper.text()).not.toContain('Flacca')
  })

  it('is the way there alone where nobody wrote how to get there', () => {
    const wrapper = mount(WhereLine, { props: { place } })

    expect(text(wrapper)).toBe('Dove Come arrivarci (apre Google Maps)')
  })

  it('opens Google Maps outside the site, from the card’s own pin, and keeps the link whole', () => {
    const link = mount(WhereLine, { props: { place, howToGetThere: '' } }).get('a')

    expect(link.attributes('href')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=41.2119%2C13.5637&travelmode=walking',
    )
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener')
    // Whole on a phone: the line wraps before the link, never inside it.
    expect(link.classes()).toContain('whitespace-nowrap')
  })

  it('is a line of text, not a button (D6)', () => {
    const wrapper = mount(WhereLine, { props: { place } })

    expect(wrapper.element.tagName).toBe('P')
    expect(wrapper.get('a').classes()).not.toContain('rounded-full')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
