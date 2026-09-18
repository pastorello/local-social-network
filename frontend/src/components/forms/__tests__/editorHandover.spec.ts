import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, ref } from 'vue'

import MapPointsField from '../MapPointsField.vue'
import StopsField from '../StopsField.vue'
import type { MapPoint } from '@/definitions/interfaces/Content'
import type { StopDraft } from '@/lib/tours'
import { useMapStore } from '@/stores/map'

// ItineraryForm's two map tabs: *Tappe* (StopsField) and *Il tragitto*
// (MapPointsField). Switching between them hands the one map editor from one
// field to the other in a single flush, and the fields' watchers run in
// component order, not in the order the handover needs.
const mountTabs = (order: 'stops-first' | 'path-first') => {
  const tab = ref<'tappe' | 'tragitto'>('tappe')
  const stops = ref<StopDraft[]>([])
  const path = ref<MapPoint[]>([])
  const stopsField = () =>
    h(StopsField, {
      modelValue: stops.value,
      'onUpdate:modelValue': (next: StopDraft[]) => (stops.value = next),
      drawing: tab.value === 'tappe',
      joined: true,
    })
  const pathField = () =>
    h(MapPointsField, {
      modelValue: path.value,
      'onUpdate:modelValue': (next: MapPoint[]) => (path.value = next),
      kind: 'route',
      drawing: tab.value === 'tragitto',
      idPrefix: 'tragitto',
    })
  const Host = defineComponent({
    setup: () => () =>
      h('div', order === 'stops-first' ? [stopsField(), pathField()] : [pathField(), stopsField()]),
  })
  mount(Host)
  return { tab }
}

describe('the map editor changes hands between a form’s tabs (design.md D19)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  for (const order of ['stops-first', 'path-first'] as const) {
    it(`Tappe → Il tragitto → Tappe leaves the stops editor on (${order})`, async () => {
      const { tab } = mountTabs(order)
      const store = useMapStore()
      expect(store.editor?.kind).toBe('stops')

      tab.value = 'tragitto'
      await nextTick()
      expect(store.editor?.kind).toBe('route')

      tab.value = 'tappe'
      await nextTick()
      expect(store.editor?.kind).toBe('stops')
    })
  }
})

describe('the editor lease (stores/map.ts)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lets a field switch off only the editor it started', () => {
    const store = useMapStore()
    const first = store.startEditing(
      { kind: 'route', points: [], max: 10, label: '' },
      () => {},
      () => {},
    )
    store.startEditing(
      { kind: 'pins', points: [], max: 1, label: '' },
      () => {},
      () => {},
    )

    store.stopEditing(first)
    expect(store.editor?.kind).toBe('pins')

    store.stopEditing()
    expect(store.editor).toBeNull()
  })
})
