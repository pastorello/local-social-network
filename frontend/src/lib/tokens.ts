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
