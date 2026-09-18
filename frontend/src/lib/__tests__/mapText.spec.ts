import { describe, it, expect } from 'vitest'
import L from 'leaflet'

import { mapText } from '../mapText'

const HOSTILE = '<img src=x onerror="window.__pwned = true">Chiesa'

describe('mapText — the map shows text, never markup (ADR-0001, 2026-09-18)', () => {
  it('keeps a hostile title as text', () => {
    const node = mapText(HOSTILE)

    expect(node.textContent).toBe(HOSTILE)
    expect(node.querySelector('img')).toBeNull()
  })

  it('is what a real Leaflet tooltip renders, where a bare string would be HTML', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const map = L.map(container).setView([41.21, 13.57], 15)

    const safe = L.circleMarker([41.21, 13.57]).bindTooltip(mapText(HOSTILE), { permanent: true })
    safe.addTo(map)
    expect(safe.getTooltip()?.getElement()?.querySelector('img')).toBeNull()
    expect(safe.getTooltip()?.getElement()?.textContent).toBe(HOSTILE)

    // The control: the call this helper replaced. If Leaflet ever stops
    // treating strings as HTML, this fails and the helper can be revisited.
    const unsafe = L.circleMarker([41.21, 13.57]).bindTooltip(HOSTILE, { permanent: true })
    unsafe.addTo(map)
    expect(unsafe.getTooltip()?.getElement()?.querySelector('img')).not.toBeNull()

    map.remove()
    container.remove()
  })

  it('is the only thing any bindTooltip in src/ is handed', () => {
    const sources = import.meta.glob<string>('/src/**/*.{vue,ts}', {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    const offenders: string[] = []
    for (const [path, source] of Object.entries(sources)) {
      if (path.includes('__tests__')) continue
      for (const match of source.matchAll(/bindTooltip\(\s*([^\s(]*)/g)) {
        if (match[1] !== 'mapText') offenders.push(`${path}: bindTooltip(${match[1]}…`)
      }
    }

    expect(Object.keys(sources).some((path) => path.endsWith('GaetaMap.vue'))).toBe(true)
    expect(offenders).toEqual([])
  })
})
