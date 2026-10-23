import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { contrastRatio, readToken } from '../tokens'
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

// The hex a token holds in main.css, read from the disk — the stylesheet is
// the source of truth (D8), and Vitest hands one imported `?raw` back empty.
const CSS = readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf8')
const token = (name: string): string => {
  const found = CSS.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))
  if (!found?.[1]) throw new Error(`${name} is not in main.css`)
  return found[1]
}

describe('contrastRatio (spec/design.md D9)', () => {
  it('is WCAG 2.1’s ratio: 21 for black on white, 1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('#0f5f73', '#0f5f73')).toBe(1)
  })

  it('agrees with the ratios main.css writes beside its tokens', () => {
    expect(contrastRatio(token('--color-ink'), token('--color-surface'))).toBeCloseTo(14.76, 2)
    expect(contrastRatio(token('--color-muted'), token('--color-page'))).toBeCloseTo(5.47, 2)
  })
})

// Review PR-8 (A-02, L-10): the toast was a pale pink with grey text, judged
// by eye. Its pair is two tokens now, and this is the measurement.
describe('the toast’s colours', () => {
  it('clear 4.5:1, the bar for its text (WCAG 1.4.3)', () => {
    expect(
      contrastRatio(token('--color-toast-fg'), token('--color-toast-bg')),
    ).toBeGreaterThanOrEqual(4.5)
  })
})
