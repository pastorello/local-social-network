// The one bridge between the palette (assets/main.css `@theme`) and the few
// places that must hand a colour to something that cannot read CSS — Leaflet
// takes `fillColor: '#0f5f73'`, not `var(--color-sea)`.
//
// Reading the custom property back at runtime keeps D8 honest: the CSS stays
// the single source of truth, so re-theming the app for another town (roadmap
// item 5) means changing values in one file, not hunting hex through the tree.
const FALLBACK_CACHE = new Map<string, string>()

export function readToken(name: string, fallback: string): string {
  const cached = FALLBACK_CACHE.get(name)
  if (cached) return cached

  // jsdom returns '' for custom properties it never cascaded, and so does any
  // call made before the stylesheet lands. The fallback is the same value the
  // CSS declares, so the two can't silently drift into different colours —
  // they can only fail to be re-themed, which is visible rather than subtle.
  const resolved =
    typeof window === 'undefined'
      ? ''
      : getComputedStyle(document.documentElement).getPropertyValue(name).trim()

  const value = resolved || fallback
  if (resolved) FALLBACK_CACHE.set(name, value)
  return value
}

// WCAG 2.1's contrast ratio between two `#rrggbb` colours — the formula D9
// asks every pairing to be checked with, rather than an eye. Here, not in a
// test, so there is one implementation for every check that needs it: the
// eyebrow's tints, the toast's pair (review PR-8, A-02).
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}
