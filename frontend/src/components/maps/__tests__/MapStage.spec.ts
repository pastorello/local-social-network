import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import axios from 'axios'

import MapStage from '../MapStage.vue'
import { useMapStore } from '@/stores/map'
import { useUserStore } from '@/stores/user'

vi.mock('axios')

// The map is drawn once the page has painted (TD-52); each test says when that
// is. Painted at once unless a test holds it back.
const paint = vi.hoisted(() => ({ done: () => Promise.resolve() }))
vi.mock('@/lib/firstPaint', () => ({ afterFirstPaint: () => paint.done() }))

// Stands in for Leaflet (jsdom cannot load it): it only relays the clicks
// MapStage listens to.
const GaetaMapStub = defineComponent({
  name: 'GaetaMap',
  props: ['pins', 'features', 'overlays', 'placing', 'focus', 'frame', 'editor', 'focusPadding'],
  emits: ['mapClick', 'pinClick', 'featureClick'],
  setup: () => () => h('div'),
})

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { render: () => null }, meta: { fullBleed: true } },
      // A wide page: on a phone it covers the map entirely.
      { path: '/benvenuto', name: 'benvenuto', component: { render: () => null } },
      { path: '/:any(.*)*', component: { render: () => null } },
    ],
  })

const mountAt = async (path: string) => {
  const router = makeRouter()
  await router.push(path)
  const push = vi.spyOn(router, 'push')
  const wrapper = mount(MapStage, {
    global: { plugins: [router], stubs: { GaetaMap: GaetaMapStub } },
  })
  await flushPromises()
  return { wrapper, push, router }
}

// The map is its own chunk (TD-52): wait for it to arrive.
const mountStage = async () => {
  const { wrapper, push } = await mountAt('/chiese/nuova')
  await vi.waitUntil(() => wrapper.findComponent(GaetaMapStub).exists())
  return { map: wrapper.findComponent(GaetaMapStub), push }
}

describe('MapStage loads the map after the page (TD-52)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
  })

  it('does not draw the map before the page has painted, and fetches its data at once', async () => {
    let painted = () => {}
    paint.done = () => new Promise<void>((resolve) => (painted = resolve))
    const { wrapper } = await mountAt('/chiese/nuova')

    expect(wrapper.findComponent(GaetaMapStub).exists()).toBe(false)
    expect(vi.mocked(axios.get)).toHaveBeenCalledWith('/api/map/features/')

    painted()
    await vi.waitUntil(() => wrapper.findComponent(GaetaMapStub).exists())
    paint.done = () => Promise.resolve()
  })

  it('waits for the map’s data too while a page covers the map', async () => {
    const pending: ((value: { data: [] }) => void)[] = []
    vi.mocked(axios.get).mockImplementation(
      () => new Promise((resolve) => pending.push(resolve as (typeof pending)[number])),
    )
    const { wrapper } = await mountAt('/benvenuto')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(wrapper.findComponent(GaetaMapStub).exists()).toBe(false)

    pending.forEach((answer) => answer({ data: [] }))
    await vi.waitUntil(() => wrapper.findComponent(GaetaMapStub).exists())
  })

  it('stops waiting for the data when the reader leaves for a page that shows the map', async () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise(() => {}))
    const { wrapper, router } = await mountAt('/benvenuto')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(wrapper.findComponent(GaetaMapStub).exists()).toBe(false)

    await router.push('/')
    await vi.waitUntil(() => wrapper.findComponent(GaetaMapStub).exists())
  })
})

describe('MapStage while a form draws on the map (design.md D19)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
  })

  it('does not open a card or a report: that would unmount the form', async () => {
    const { map, push } = await mountStage()
    const store = useMapStore()
    const added: unknown[] = []
    store.startEditing(
      { kind: 'route', points: [], max: 50, label: '' },
      (p) => added.push(p),
      () => {},
    )

    map.vm.$emit('featureClick', { type: 'chiese', id: 'c1' })
    map.vm.$emit('pinClick', 'r1')
    map.vm.$emit('mapClick', { lat: 41.21, lng: 13.57 })

    expect(push).not.toHaveBeenCalled()
    expect(added).toEqual([{ lat: 41.21, lng: 13.57 }])
  })

  it('opens them as usual when nothing is being drawn', async () => {
    const { map, push } = await mountStage()

    map.vm.$emit('featureClick', { type: 'chiese', id: 'c1' })
    map.vm.$emit('pinClick', 'r1')

    expect(push).toHaveBeenCalledTimes(2)
  })
})

describe('MapStage while a tour is open (decided 2026-09-19)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
  })

  it('draws only the tour: no other card, no report, no cluster', async () => {
    const { map } = await mountStage()
    const store = useMapStore()
    store.features = [
      {
        id: 'c1',
        type: 'chiese',
        title: 'Duomo',
        is_published: true,
        cover: null,
        points: [{ lat: 41.2, lng: 13.5, label: '' }],
        route: [],
        zones: [],
      },
    ]
    store.pins = [{ id: 'r1', title: 'Buca', status: 'open', lat: 41.21, lng: 13.57 }] as never
    await flushPromises()
    expect(map.props('features')).toHaveLength(1)

    store.setFocus({
      id: 't1',
      type: 'itinerari',
      points: [{ lat: 41.2, lng: 13.5, label: '' }],
      route: [],
      numbered: true,
    })
    await flushPromises()
    expect(map.props('features')).toEqual([])
    expect(map.props('pins')).toEqual([])

    // A card that is not a tour keeps the others on the map, dimmed.
    store.setFocus({
      id: 'c1',
      type: 'chiese',
      points: [{ lat: 41.2, lng: 13.5, label: '' }],
      route: [],
    })
    await flushPromises()
    expect(map.props('features')).toHaveLength(1)
  })
})

describe('MapStage while a page lists a set (spec cosa-fare.md Part −1, D5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
  })

  it('draws exactly that set — no other card, no report — and everything again after', async () => {
    const { map } = await mountStage()
    const store = useMapStore()
    // A collaborator: a reader has no reports to hide (reports-and-polls.md
    // R1). Signed in first, because signing in refetches what the map holds.
    useUserStore().user.isAuthenticated = true
    await flushPromises()
    const card = (id: string) => ({
      id,
      type: 'chiese',
      title: id,
      is_published: true,
      cover: null,
      points: [{ lat: 41.2, lng: 13.5, label: '' }],
      route: [],
      zones: [],
    })
    store.features = [card('c1'), card('c2')]
    store.pins = [{ id: 'r1', title: 'Buca', status: 'open', lat: 41.21, lng: 13.57 }] as never

    store.setRestriction(['c2'])
    await flushPromises()
    expect(map.props('features').map((f: { id: string }) => f.id)).toEqual(['c2'])
    expect(map.props('pins')).toEqual([])

    store.setRestriction(null)
    await flushPromises()
    expect(map.props('features')).toHaveLength(2)
    expect(map.props('pins')).toHaveLength(1)
  })

  it('hands the map the set to frame, except while a form is drawing (review PR-4)', async () => {
    const { map } = await mountStage()
    const store = useMapStore()
    const box = [
      { lat: 41.2, lng: 13.55 },
      { lat: 41.22, lng: 13.57 },
    ]

    store.setFrame(box)
    await flushPromises()
    expect(map.props('frame')).toEqual(box)

    // The form owns the view while it draws (D19).
    store.startEditing({ kind: 'pins', points: [], max: 1, label: 'Un punto' }, vi.fn(), vi.fn())
    await flushPromises()
    expect(map.props('frame')).toBeNull()

    store.stopEditing()
    await flushPromises()
    expect(map.props('frame')).toEqual(box)

    store.setFrame(null)
    await flushPromises()
    expect(map.props('frame')).toBeNull()
  })
})

describe('MapStage follows the session (spec map.md M5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
  })

  it('refetches the features — and with them the reader’s drafts — on sign-in and sign-out', async () => {
    await mountStage()
    const userStore = useUserStore()
    vi.mocked(axios.get).mockClear()

    userStore.user.isAuthenticated = true
    await flushPromises()
    userStore.user.isAuthenticated = false
    await flushPromises()

    const fetched = vi.mocked(axios.get).mock.calls.map(([url]) => url)
    expect(fetched.filter((url) => url === '/api/map/features/')).toHaveLength(2)
    expect(fetched.filter((url) => url === '/api/map/overlays/')).toHaveLength(2)
    // The reports only on the way in (reports-and-polls.md R1, 2026-10-22):
    // signing out forgets them rather than asking an API that would say 401.
    expect(fetched.filter((url) => url === '/api/reports/map/')).toHaveLength(1)
  })
})
