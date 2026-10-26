import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { OTHER_INTENT, TINTED_INTENTS, byTitle, intentOf, intentVar } from '../intents'
import { contrastRatio } from '../tokens'

describe('intents (spec cosa-fare.md Part −1, D4)', () => {
  it('files places under the activities of /benvenuto', () => {
    expect(intentOf({ type: 'luoghi', genre: 'spiaggia' })).toBe('mare')
    expect(intentOf({ type: 'luoghi', genre: 'castello' })).toBe('citta')
    // The walk is the town's since 2026-10-26: «Camminare» folded into it.
    expect(intentOf({ type: 'luoghi', genre: 'punto-panoramico' })).toBe('citta')
    // The ninth genre (2026-10-23) is seen like a viewpoint, not «Altro».
    expect(intentOf({ type: 'luoghi', genre: 'luogo-naturale' })).toBe('citta')
    expect(intentOf({ type: 'chiese', genre: null })).toBe('citta')
  })

  // ADR-0010: «Bere» leads to where one drinks; «Mangiare» to a table and to a
  // bottega alike, beside the dishes.
  it('files a business by its kind', () => {
    expect(intentOf({ type: 'attivita', kind: 'beve' })).toBe('bere')
    expect(intentOf({ type: 'attivita', kind: 'mangia' })).toBe('mangiare')
    expect(intentOf({ type: 'attivita', kind: 'compra' })).toBe('mangiare')
    expect(intentOf({ type: 'attivita', kind: null })).toBe(OTHER_INTENT)
  })

  it('shows a genre nobody has mapped yet instead of losing it', () => {
    expect(intentOf({ type: 'luoghi', genre: 'grotta' })).toBe(OTHER_INTENT)
    expect(intentOf({ type: 'luoghi', genre: null })).toBe(OTHER_INTENT)
  })

  it('sorts as an Italian reader expects, accents and capitals aside', () => {
    const titles = ['torre', 'Ariana', 'Égalité', 'arenauta'].map((title) => ({ title }))
    expect(titles.sort(byTitle).map((t) => t.title)).toEqual([
      'arenauta',
      'Ariana',
      'Égalité',
      'torre',
    ])
  })
})

// The colour a token holds in main.css, following a `var()` to the hex it
// ends on — the intents' tokens name the palette's rather than repeat it. From
// the disk: Vitest hands a stylesheet imported `?raw` back empty.
const CSS = readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf8')
const token = (name: string): string => {
  const found = CSS.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6}|var\\((--[a-z-]+)\\))`, 'i'))
  if (!found?.[1]) throw new Error(`${name} is not in main.css`)
  return found[2] ? token(found[2]) : found[1]
}

// `color-mix(in oklab, colour 18%, page)`, as the browser draws IntentTile's
// ground: both colours to Oklab, mixed there, and back to sRGB.
const toLinear = (hex: string) =>
  [1, 3, 5].map((at) => {
    const c = parseInt(hex.slice(at, at + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
const toOklab = ([r, g, b]: [number, number, number]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
const fromOklab = ([L, a, b]: number[]) => {
  const l = (L! + 0.3963377774 * a! + 0.2158037573 * b!) ** 3
  const m = (L! - 0.1055613458 * a! - 0.0638541728 * b!) ** 3
  const s = (L! - 0.0894841775 * a! - 1.291485548 * b!) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const channel = (c: number) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${linear.map(channel).join('')}`
}
const tint = (hex: string, share: number, ground: string) => {
  const [colour, base] = [toOklab(toLinear(hex)), toOklab(toLinear(ground))]
  return fromOklab(colour.map((value, i) => value * share + base[i]! * (1 - share)))
}

describe('the intents’ colours on /benvenuto (review PR-14, M-09)', () => {
  it('are tokens, never hexes, and an intent nobody coloured wears the unknown grey', () => {
    expect(intentVar('mare')).toBe('var(--color-intent-mare)')
    expect(intentVar('citta')).toBe('var(--color-intent-citta)')
    expect(intentVar('bere')).toBe('var(--color-intent-bere)')
    expect(intentVar('sport')).toBe('var(--color-layer-unknown)')
  })

  it('mixes as the browser does: a colour on itself, the ground at none of it', () => {
    expect(tint('#0f5f73', 1, '#faf7f2')).toBe('#0f5f73')
    expect(tint('#0f5f73', 0, '#faf7f2')).toBe('#faf7f2')
  })

  // D9, measured: the icon is drawn in the full colour on its own tint, and
  // the card is a surface — so each clears 3:1 on the tint (WCAG 1.4.11, a
  // graphic) and 4.5:1 on the surface, the bar the day it carries text.
  it.each(TINTED_INTENTS)('%s clears 3:1 on its tint and 4.5:1 on the surface', (slug) => {
    const colour = token(`--color-intent-${slug}`)
    const ground = tint(colour, 0.18, token('--color-page'))

    expect(contrastRatio(colour, ground)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(colour, token('--color-surface'))).toBeGreaterThanOrEqual(4.5)
  })
})
