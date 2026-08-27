import { describe, it, expect } from 'vitest'

import { CARD_LAYERS, layerColor, layerRoute } from '../mapLayers'

describe('mapLayers', () => {
  it('covers exactly the card types the spec gives a map footprint', () => {
    // dialetto is deliberately absent (spec map.md M2: "none").
    expect(CARD_LAYERS.map((layer) => layer.key)).toEqual([
      'chiese',
      'feste',
      'ricette',
      'personaggi',
    ])
  })

  it('routes a pin to its own card', () => {
    expect(layerRoute('feste', 'abc')).toBe('/feste/abc')
  })

  it('falls back instead of building a route to a type it does not know', () => {
    // The API could grow a type before the SPA does; a broken link is worse
    // than landing on the map.
    expect(layerRoute('sconosciuto', 'abc')).toBe('/')
    expect(layerColor('sconosciuto')).toBe('#6b7280')
  })
})
