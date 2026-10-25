import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { formatEventDay, formatEventWhen } from '../when'

// The one formatter for an event's date (spec cosa-fare.md CF34): never a day
// without its weekday, and never a day moved by a time zone.
describe('when', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Noon in Gaeta, 25 October 2026.
    vi.setSystemTime(new Date('2026-10-25T11:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('never prints a day without its weekday', () => {
    expect(formatEventDay('2026-10-31')).toBe('sabato 31 ottobre')
    expect(formatEventDay('2026-11-01')).toBe('domenica 1 novembre')
  })

  it('says the year only when it is not this year in Gaeta, or when asked to', () => {
    expect(formatEventDay('2027-01-06')).toBe('mercoledì 6 gennaio 2027')
    expect(formatEventDay('2026-12-08', { year: true })).toBe('martedì 8 dicembre 2026')
  })

  it('knows the year in Gaeta, not the browser’s', () => {
    // 23:30 UTC on 31 December is already New Year’s Day in Gaeta.
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    expect(formatEventDay('2027-01-02')).toBe('sabato 2 gennaio')
  })

  it('puts the hour beside the first day', () => {
    expect(formatEventWhen({ start_date: '2026-10-31', start_time: '22:00:00' })).toBe(
      'sabato 31 ottobre, ore 22:00',
    )
    expect(
      formatEventWhen({ start_date: '2026-10-31', start_time: null, end_date: '2026-10-31' }),
    ).toBe('sabato 31 ottobre')
  })

  it('names both ends of an event that lasts, each with its weekday', () => {
    expect(formatEventWhen({ start_date: '2026-12-04', end_date: '2026-12-06' })).toBe(
      'da venerdì 4 dicembre a domenica 6 dicembre',
    )
    expect(
      formatEventWhen({ start_date: '2026-11-28', start_time: '18:00', end_date: '2027-01-06' }),
    ).toBe('da sabato 28 novembre, ore 18:00, a mercoledì 6 gennaio 2027')
  })
})
