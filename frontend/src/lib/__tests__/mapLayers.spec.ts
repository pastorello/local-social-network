import { describe, it, expect } from 'vitest'

import { CARD_LAYERS, layerRoute } from '../mapLayers'

describe('mapLayers', () => {
  it('covers exactly the card types the spec gives a map footprint', () => {
    // dialetto and libri are deliberately absent (spec content.md: "none");
    // luoghi has one fixed pin, like a church (spec content.md, 2026-09-11).
    expect(CARD_LAYERS.map((layer) => layer.key)).toEqual([
      'chiese',
      'feste',
      'ricette',
      'personaggi',
      'luoghi',
    ])
  })

  it('routes a pin to its own card', () => {
    expect(layerRoute('feste', 'abc')).toBe('/feste/abc')
  })

  it('falls back instead of building a route to a type it does not know', () => {
    // The API could grow a type before the SPA does; a broken link is worse
    // than landing on the map. (The colour fallback is covered in
    // tokens.spec.ts, alongside the rest of the palette wiring.)
    expect(layerRoute('sconosciuto', 'abc')).toBe('/')
  })
})
