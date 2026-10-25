import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import FestaDates from '../FestaDates.vue'

// When a feast is (cosa-fare.md Part −1 D9, K2): its editions, or its
// recurrence and «data non ancora confermata» — never a guessed date.
describe('FestaDates', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('without an edition, prints the recurrence and that the date is not confirmed', () => {
    const wrapper = mount(FestaDates, {
      props: { editions: [], recurrence: 'La seconda domenica di agosto' },
    })

    expect(wrapper.text()).toBe('La seconda domenica di agosto · data non ancora confermata')
  })

  it('with no recurrence either, still says only that the date is not confirmed', () => {
    const wrapper = mount(FestaDates, { props: { editions: [], recurrence: '' } })

    expect(wrapper.text()).toBe('data non ancora confermata')
  })

  it('prints the editions typed, with their weekday, and the recurrence beside', () => {
    const wrapper = mount(FestaDates, {
      props: {
        editions: [{ id: 1, start_date: '2027-08-08', end_date: '2027-08-08', note: 'A mare' }],
        recurrence: 'La seconda domenica di agosto',
      },
    })

    expect(wrapper.get('li').text()).toBe('domenica 8 agosto 2027 — A mare')
    expect(wrapper.text()).toContain('Di solito: La seconda domenica di agosto')
    expect(wrapper.text()).not.toContain('non ancora confermata')
  })
})
