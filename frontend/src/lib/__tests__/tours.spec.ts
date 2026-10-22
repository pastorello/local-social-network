import { describe, it, expect } from 'vitest'

import { pointOf, type StopDraft } from '../tours'

describe('pointOf', () => {
  const stop = (patch: Partial<StopDraft>): StopDraft => ({
    card: 'c',
    type: 'luoghi',
    title: 'T',
    point_index: null,
    points: [],
    route: [],
    savedPoint: null,
    note: '',
    ...patch,
  })

  it('is the chosen pin, else the first, else a route’s start, else the saved point', () => {
    const a = { lat: 1, lng: 1, label: '' }
    const b = { lat: 2, lng: 2, label: '' }
    expect(pointOf(stop({ points: [a, b], point_index: 1 }))).toEqual(b)
    expect(pointOf(stop({ points: [a, b] }))).toEqual(a)
    expect(pointOf(stop({ route: [b, a] }))).toEqual(b)
    expect(pointOf(stop({ savedPoint: a }))).toEqual(a)
  })
})
