import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import axios from 'axios'

import MapStage from '../MapStage.vue'
import { useMapStore } from '@/stores/map'

vi.mock('axios')

// Stands in for Leaflet (jsdom cannot load it): it only relays the clicks
// MapStage listens to.
const GaetaMapStub = defineComponent({
  name: 'GaetaMap',
  props: ['pins', 'features', 'overlays', 'placing', 'focus', 'editor', 'focusPadding'],
  emits: ['mapClick', 'pinClick', 'featureClick'],
  setup: () => () => h('div'),
})

const mountStage = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:any(.*)*', component: { render: () => null } }],
  })
  await router.push('/chiese/nuova')
  const push = vi.spyOn(router, 'push')
  const wrapper = mount(MapStage, {
    global: { plugins: [router], stubs: { GaetaMap: GaetaMapStub } },
  })
  await flushPromises()
  return { map: wrapper.findComponent(GaetaMapStub), push }
}

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
    const card = (id: string) => ({
      id,
      type: 'chiese',
      title: id,
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
})
