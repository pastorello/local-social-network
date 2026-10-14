import { describe, it, expect } from 'vitest'

import { OSM_ATTRIBUTION, OSM_COPYRIGHT_URL } from '../osm'

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
    const sources = import.meta.glob<string>('/src/**/*.vue', {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    const layers = Object.entries(sources).flatMap(([path, source]) =>
      [...source.matchAll(/<l-tile-layer[^>]*>/g)].map((match) => ({ path, tag: match[0] })),
    )
    const uncredited = layers
      .filter(({ tag }) => !tag.includes(':attribution="OSM_ATTRIBUTION"'))
      .map(({ path }) => path)

    expect(layers.length).toBeGreaterThan(0)
    expect(uncredited).toEqual([])
  })
})
