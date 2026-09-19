import { describe, it, expect } from 'vitest'

import { legDirections, pointOf, type StopDraft } from '../tours'

describe('legDirections — "Come arrivarci" (spec itinerari.md I7)', () => {
  it('is a walking Google Maps link from the previous stop to this one', () => {
    const url = new URL(
      legDirections({ lat: 41.2, lng: 13.5, label: '' }, { lat: 41.21, lng: 13.57, label: '' }),
    )

    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('origin')).toBe('41.2,13.5')
    expect(url.searchParams.get('destination')).toBe('41.21,13.57')
    expect(url.searchParams.get('travelmode')).toBe('walking')
  })

  it('leaves the origin to Google — wherever the guest is — for the first stop', () => {
    const url = new URL(legDirections(null, { lat: 41.21, lng: 13.57, label: '' }))
    expect(url.searchParams.has('origin')).toBe(false)
  })

  it('can leave the way of travelling to Google, for a raccolta’s "Portami"', () => {
    const url = new URL(legDirections(null, { lat: 41.21, lng: 13.57, label: '' }, null))
    expect(url.searchParams.has('travelmode')).toBe(false)
  })
})

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
