import { describe, it, expect } from 'vitest'

import { directionsUrl } from '../directions'

describe('directionsUrl — "Come arrivarci" (review PR-3, spec itinerari.md I7)', () => {
  it('is a walking Google Maps link to the place, from wherever the reader is', () => {
    expect(directionsUrl({ lat: 41.2087, lng: 13.5868 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=41.2087%2C13.5868&travelmode=walking',
    )
    const url = new URL(directionsUrl({ lat: 41.2087, lng: 13.5868 }))
    expect(url.searchParams.get('destination')).toBe('41.2087,13.5868')
    // Google starts the way from where the reader is when no origin is given.
    expect(url.searchParams.has('origin')).toBe(false)
  })

  it('starts a tour’s leg from the previous stop', () => {
    const url = new URL(
      directionsUrl({ lat: 41.21, lng: 13.57 }, { from: { lat: 41.2, lng: 13.5 } }),
    )

    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('origin')).toBe('41.2,13.5')
    expect(url.searchParams.get('destination')).toBe('41.21,13.57')
    expect(url.searchParams.get('travelmode')).toBe('walking')
  })

  it('can leave the way of travelling to Google, for a raccolta’s "Portami"', () => {
    const url = new URL(directionsUrl({ lat: 41.21, lng: 13.57 }, { mode: null }))
    expect(url.searchParams.has('travelmode')).toBe(false)
  })
})
