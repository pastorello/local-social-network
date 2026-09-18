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
