import { describe, it, expect } from 'vitest'

import type { Zone } from '@/definitions/interfaces/MapData'
import { previewNames, zonesWithPlaces } from '../doors'

const zone = (slug: string, count: number): Zone => ({
  slug,
  name: slug,
  geometry: { type: 'Polygon', coordinates: [] },
  count,
})

// No door onto an empty room (cosa-fare.md Part −1 D8): the wizard's zone
// answer on /benvenuto and the home (review PR-21) is decided from these.
describe('doors', () => {
  it('offers the zones only once one has a published place', () => {
    expect(zonesWithPlaces([zone('serapo', 0), zone('porto-salvo', 0)])).toEqual([])
    expect(zonesWithPlaces([zone('serapo', 0), zone('porto-salvo', 3)])).toEqual([
      zone('porto-salvo', 3),
    ])
  })

  it('names what is behind a door, the first two, and says when there are more', () => {
    expect(previewNames(['Serapo'])).toBe('Serapo')
    expect(previewNames(['Serapo', 'Porto Salvo'])).toBe('Serapo · Porto Salvo')
    expect(previewNames(['Serapo', 'Porto Salvo', 'Monte Orlando'])).toBe('Serapo · Porto Salvo…')
  })
})
