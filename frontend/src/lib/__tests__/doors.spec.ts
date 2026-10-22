import { describe, it, expect } from 'vitest'

import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { Zone } from '@/definitions/interfaces/MapData'
import { intentsWithTours, previewNames, zonesWithPlaces } from '../doors'

const intent = (slug: string, count: number): Intent => ({
  slug,
  name: slug,
  name_plural: slug,
  description: '',
  count,
})

const zone = (slug: string, count: number): Zone => ({
  slug,
  name: slug,
  geometry: { type: 'Polygon', coordinates: [] },
  count,
})

// No door onto an empty room (spec itinerari.md I5/I6, cosa-fare.md Part −1
// D8): /benvenuto and the home both decide what to offer from these.
describe('doors', () => {
  it('offers an intent only once it has a published tour', () => {
    expect(
      intentsWithTours([intent('mare', 1), intent('mangiare', 0), intent('citta', 2)]),
    ).toEqual([intent('mare', 1), intent('citta', 2)])
  })

  it('offers nothing when no tour is published', () => {
    expect(intentsWithTours([intent('mare', 0), intent('citta', 0)])).toEqual([])
    expect(intentsWithTours([])).toEqual([])
  })

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
