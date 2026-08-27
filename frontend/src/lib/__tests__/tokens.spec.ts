import { describe, it, expect } from 'vitest'

import { readToken } from '../tokens'
import { CARD_LAYERS, layerColor } from '../mapLayers'
import { STATUS_META, statusColor } from '../reportStatus'

describe('readToken', () => {
  it('falls back to the declared value when the property has not cascaded', () => {
    // jsdom never applies the stylesheet, so this is also what every unit
    // test sees: the fallback is the same colour main.css declares, so the
    // two cannot drift into *different* colours — only into a value that
    // fails to re-theme, which is visible rather than subtle.
    expect(readToken('--color-nothing-declares-this', '#0f5f73')).toBe('#0f5f73')
  })

  it('reads the property when the document does define it', () => {
    document.documentElement.style.setProperty('--color-test-only', '#123456')

    expect(readToken('--color-test-only', '#ffffff')).toBe('#123456')
  })
})

describe('palette wiring (spec/design.md D8)', () => {
  it('gives every map layer a colour without any component knowing a hex', () => {
    CARD_LAYERS.forEach((layer) => {
      expect(layerColor(layer.key)).toBe(layer.fallback)
    })
  })

  it('falls back for a type the SPA does not know yet', () => {
    // The API could grow a card type before the SPA does; a grey pin beats
    // an undefined fill.
    expect(layerColor('sconosciuto')).toBe('#6b7280')
  })

  it('gives every report status a colour', () => {
    expect(statusColor('open')).toBe(STATUS_META.open.fallback)
    expect(statusColor('rejected')).toBe(STATUS_META.rejected.fallback)
  })
})
