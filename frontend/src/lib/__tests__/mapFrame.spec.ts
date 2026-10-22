import { describe, it, expect } from 'vitest'

import { FRAME_MAX_ZOOM, GAETA_BOUNDS, frameInFreeSpace } from '../mapFrame'

const PHONE = { x: 390, y: 720 }
// The phone's strip above a card (D18), as MapStage hands it over: 16px in
// from the sides, from just below the menu to 16px above the article.
const STRIP = { topLeft: [16, 84] as [number, number], bottomRight: [16, 472] as [number, number] }

describe('frameInFreeSpace — one frame for every page (review PR-5, A-07)', () => {
  it('puts a single place at zoom 16, not on a field with no street to know it by', () => {
    const frame = frameInFreeSpace([{ lat: 41.2048, lng: 13.5702 }], STRIP, PHONE)

    // Leaflet takes a box with no size to the cap.
    expect(frame?.bounds).toEqual([
      [41.2048, 13.5702],
      [41.2048, 13.5702],
    ])
    expect(frame?.options.maxZoom).toBe(16)
    expect(FRAME_MAX_ZOOM).toBe(16)
  })

  it('frames a route or a set by its box, held to the same cap', () => {
    const route = [
      { lat: 41.2304, lng: 13.5664 },
      { lat: 41.22, lng: 13.569 },
      { lat: 41.2119, lng: 13.5638 },
    ]

    const frame = frameInFreeSpace(route, STRIP, PHONE)

    expect(frame?.bounds).toEqual([
      [41.2119, 13.5638],
      [41.2304, 13.569],
    ])
    expect(frame?.options.maxZoom).toBe(16)
  })

  it('fits into the space the page leaves free, or a plain margin when it leaves all of it', () => {
    const point = [{ lat: 41.21, lng: 13.57 }]

    expect(frameInFreeSpace(point, STRIP, PHONE)?.options).toMatchObject({
      paddingTopLeft: [16, 84],
      paddingBottomRight: [16, 472],
    })
    expect(frameInFreeSpace(point)?.options).toMatchObject({
      paddingTopLeft: [48, 48],
      paddingBottomRight: [48, 48],
    })
  })

  it('leaves the map where it is when there is no room to frame anything in', () => {
    // The home's sheet pulled all the way up: a sliver of map under the menu.
    const sliver = {
      topLeft: [16, 84] as [number, number],
      bottomRight: [16, 628] as [number, number],
    }

    expect(frameInFreeSpace(GAETA_BOUNDS, sliver, PHONE)).toBeNull()
    // Without the map's size there is nothing to measure against.
    expect(frameInFreeSpace(GAETA_BOUNDS, sliver)).not.toBeNull()
  })

  it('frames nothing when it is handed nothing', () => {
    expect(frameInFreeSpace([], STRIP, PHONE)).toBeNull()
  })

  it('takes Gaeta from Sant’Agostino to Monte Orlando, the Montagna Spaccata and the medieval quarter', () => {
    const [south, north] = GAETA_BOUNDS
    const inside = ({ lat, lng }: { lat: number; lng: number }) =>
      lat >= south!.lat && lat <= north!.lat && lng >= south!.lng && lng <= north!.lng

    // seed_demo's points, one in each zone.
    expect(inside({ lat: 41.2337, lng: 13.4946 })).toBe(true) // Sant'Agostino
    expect(inside({ lat: 41.2071, lng: 13.5767 })).toBe(true) // Monte Orlando
    expect(inside({ lat: 41.2048, lng: 13.5702 })).toBe(true) // Montagna Spaccata
    expect(inside({ lat: 41.2086, lng: 13.5866 })).toBe(true) // Gaeta Medievale
    expect(inside({ lat: 41.2304, lng: 13.5664 })).toBe(true) // Porto Salvo
  })
})
