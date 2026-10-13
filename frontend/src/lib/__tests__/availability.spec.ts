import { describe, it, expect } from 'vitest'

import { formatDay, hasVisitInfo, emptyAvailability } from '../availability'

describe('availability', () => {
  // A calendar day, not an instant: no time zone may move it to the day before.
  it('formats a reported day in Italian, whatever the time zone', () => {
    expect(formatDay('2026-03-12')).toBe('12 marzo 2026')
    expect(formatDay('2026-01-01')).toBe('1 gennaio 2026')
  })

  it('treats unknown and empty as nothing to show', () => {
    expect(hasVisitInfo(emptyAvailability())).toBe(false)
    expect(hasVisitInfo({ ...emptyAvailability(), keeper: 'Don Mario' })).toBe(true)
    expect(hasVisitInfo({ ...emptyAvailability(), state: 'works' })).toBe(true)
  })
})
