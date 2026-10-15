import { describe, it, expect } from 'vitest'

import { OSM_ATTRIBUTION, OSM_COPYRIGHT_URL, OSM_TILE_URL } from '../osm'

// The tile policy's own words are "Use exactly:" this URL; the a/b/c
// subdomains it replaced "may be slower or withdrawn without notice".
describe('the OpenStreetMap tiles', () => {
  it('come from the one host the tile policy names', () => {
    expect(OSM_TILE_URL).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
  })

  it('are preconnected from index.html, to that same host', () => {
    const [html] = Object.values(
      import.meta.glob<string>('/index.html', { query: '?raw', import: 'default', eager: true }),
    )

    expect(html).toContain(`<link rel="preconnect" href="${new URL(OSM_TILE_URL).origin}" />`)
  })
})

// OpenStreetMap's tile policy and the ODbL ask for a visible credit that names
// OpenStreetMap and links to its copyright page. No unit test mounts a real
// Leaflet map here, so these read the source the map is built from.
describe('the OpenStreetMap credit', () => {
  it('names OpenStreetMap and links to its copyright page', () => {
    const node = document.createElement('div')
    node.innerHTML = OSM_ATTRIBUTION
    const link = node.querySelector('a')

    expect(link?.getAttribute('href')).toBe(OSM_COPYRIGHT_URL)
    expect(OSM_COPYRIGHT_URL).toBe('https://www.openstreetmap.org/copyright')
    expect(link?.textContent).toBe('OpenStreetMap')
    expect(node.textContent).toContain('©')
  })

  it('is given to every tile layer in src/', () => {
    const sources = import.meta.glob<string>(
      ['/src/**/*.vue', '/src/**/*.ts', '!/src/**/__tests__/**'],
      { query: '?raw', import: 'default', eager: true },
    )
    const layers = Object.entries(sources).flatMap(([path, source]) =>
      [...source.matchAll(/L\.tileLayer\([^)]*\)/g)].map((match) => ({ path, call: match[0] })),
    )
    const uncredited = layers
      .filter(({ call }) => !call.includes('attribution: OSM_ATTRIBUTION'))
      .map(({ path }) => path)

    expect(layers.length).toBeGreaterThan(0)
    expect(uncredited).toEqual([])
  })
})
