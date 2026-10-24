import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import axios from 'axios'

import { useMapStore } from '../map'
import { useUserStore } from '../user'

vi.mock('axios')

const FEATURES = [
  { id: 'c1', type: 'chiese', title: 'Chiesa', cover: null, points: [], route: [] },
  { id: 'f1', type: 'feste', title: 'Festa', cover: null, points: [], route: [] },
]
const PINS = [{ id: 'r1', title: 'Buca', lat: 41.2, lng: 13.5, status: 'open', category_id: 'x' }]
const OVERLAYS = [
  {
    id: 'o1',
    name: 'Quartieri',
    kind: 'vector',
    position: 0,
    geojson: null,
    color: '#000000',
    imageURL: null,
    bounds: null,
    opacity: 0.6,
  },
]

describe('the map store (spec/design.md D13)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/map/features/') return Promise.resolve({ data: FEATURES })
      if (url === '/api/map/overlays/') return Promise.resolve({ data: OVERLAYS })
      if (url === '/api/reports/map/') return Promise.resolve({ data: PINS })
      return Promise.resolve({ data: [] })
    })
  })

  it('loads the map once per session, not once per page opened over it', async () => {
    const store = useMapStore()

    await store.load()
    await store.load()

    const featureCalls = vi
      .mocked(axios.get)
      .mock.calls.filter(([url]) => url === '/api/map/features/')
    expect(featureCalls).toHaveLength(1)
    expect(store.features).toHaveLength(2)
  })

  // A page that lists the features waits for them (TD-53), so a failure has
  // to say so as well, or the page would wait for ever.
  it('says when the features have come back, answered or not', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const store = useMapStore()
    expect(store.featuresLoaded).toBe(false)

    await store.load()

    expect(store.featuresLoaded).toBe(true)
    expect(store.features).toEqual([])
  })

  it('draws only the layers the reader left on', async () => {
    const store = useMapStore()
    await store.load()

    store.activeLayers.chiese = false

    expect(store.visibleFeatures.map((feature) => feature.id)).toEqual(['f1'])
  })

  it('takes the reports off the map with their layer', async () => {
    useUserStore().user.isAuthenticated = true
    const store = useMapStore()
    await store.load()
    expect(store.visiblePins).toHaveLength(1)

    store.activeLayers.segnalazioni = false

    expect(store.visiblePins).toHaveLength(0)
  })

  // Reports are for people with an account (decided 2026-10-22, spec
  // reports-and-polls.md R1). The API answers a reader with a 401, so asking
  // would only be noise — and a pin the store still held must not reach them.
  it('never asks a reader for reports, nor hands them one', async () => {
    const store = useMapStore()
    await store.load()

    const asked = vi.mocked(axios.get).mock.calls.map(([url]) => url)
    expect(asked).not.toContain('/api/reports/map/')
    expect(asked).not.toContain('/api/categories/')

    store.pins = PINS as never
    expect(store.visiblePins).toEqual([])
  })

  it('forgets the reports, and a filing under way, when the collaborator signs out', async () => {
    const user = useUserStore().user
    user.isAuthenticated = true
    const store = useMapStore()
    await store.load()
    store.startPlacing()
    expect(store.pins).toHaveLength(1)

    user.isAuthenticated = false
    await store.loadReports()

    expect(store.pins).toEqual([])
    expect(store.categories).toEqual([])
    expect(store.placing).toBe(false)
  })

  it('turns the reports layer back on when a report is being placed', () => {
    const store = useMapStore()
    store.activeLayers.segnalazioni = false

    store.startPlacing()

    expect(store.placing).toBe(true)
    expect(store.activeLayers.segnalazioni).toBe(true)
  })

  it('draws an overlay only once switched on, at the reader’s opacity', async () => {
    const store = useMapStore()
    await store.load()
    expect(store.visibleOverlays).toEqual([])

    store.activeOverlays.o1 = true
    store.overlayOpacity.o1 = 0.2

    expect(store.visibleOverlays).toHaveLength(1)
    expect(store.visibleOverlays[0]!.opacity).toBe(0.2)
  })
})
