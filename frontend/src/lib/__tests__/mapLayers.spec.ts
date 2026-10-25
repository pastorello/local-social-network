import { describe, it, expect } from 'vitest'

import { CARD_LAYERS, STOP_TYPES, layerRoute } from '../mapLayers'

describe('mapLayers', () => {
  it('covers exactly the card types the spec gives a map footprint', () => {
    // dialetto and libri are deliberately absent (spec content.md: "none");
    // luoghi has one fixed pin, like a church (spec content.md, 2026-09-11),
    // and so does a business (ADR-0010).
    expect(CARD_LAYERS.map((layer) => layer.key)).toEqual([
      'chiese',
      'feste',
      'ricette',
      'personaggi',
      'luoghi',
      'attivita',
    ])
  })

  // cosa-fare.md I3's trap: one list was both the layers and what a stop may
  // be, so a type on the map was a stop. A business is on the map and never
  // a stop — a tour that picked one would rank them (CF40, ADR-0010).
  it('keeps what can be a tour’s stop a list of its own, without the businesses', () => {
    const layers = CARD_LAYERS.map((layer) => layer.key)
    expect(STOP_TYPES.every((key) => layers.includes(key))).toBe(true)
    expect(STOP_TYPES).not.toContain('attivita')
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
