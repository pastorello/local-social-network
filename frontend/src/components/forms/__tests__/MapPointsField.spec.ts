import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref } from 'vue'

import MapPointsField from '../MapPointsField.vue'
import { useMapStore } from '@/stores/map'
import type { MapPoint } from '@/definitions/interfaces/Content'

const A: MapPoint = { lat: 41.21, lng: 13.57, label: 'Partenza' }
const B: MapPoint = { lat: 41.22, lng: 13.58, label: 'Arrivo' }

// A host that owns the points, as the forms do: the field emits, the host keeps.
const mountField = (props: {
  kind: 'route' | 'pins'
  points?: MapPoint[]
  max?: number
  drawing?: boolean
  readonly?: boolean
}) => {
  const points = ref<MapPoint[]>(props.points ?? [])
  const drawing = ref(props.drawing ?? true)
  const done = ref(0)
  const Host = defineComponent({
    setup: () => () =>
      h(MapPointsField, {
        modelValue: points.value,
        'onUpdate:modelValue': (next: MapPoint[]) => (points.value = next),
        onDone: () => done.value++,
        kind: props.kind,
        max: props.max,
        readonly: props.readonly,
        drawing: drawing.value,
        idPrefix: 'test',
      }),
  })
  const wrapper = mount(Host)
  return { wrapper, points, drawing, done }
}

describe('MapPointsField — the map under the panel as the editor (design.md D19)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lends its points to the map while drawing, and a click on the map adds one', async () => {
    const { points } = mountField({ kind: 'route', points: [A] })
    const store = useMapStore()

    expect(store.editor?.kind).toBe('route')
    expect(store.editor?.points).toEqual([A])
    expect(store.editor?.label).toContain('aggiungere la tappa 2')

    store.editorAdd({ lat: 41.23, lng: 13.59 })

    // The form owns the data: the click changed the host's points, and the
    // map's draft followed.
    expect(points.value).toHaveLength(2)
    await Promise.resolve()
    expect(store.editor?.points).toHaveLength(2)
  })

  it('stops lending the map when its tab closes, and when it goes away', async () => {
    const { wrapper, drawing } = mountField({ kind: 'pins', max: 1 })
    const store = useMapStore()
    expect(store.editor).not.toBeNull()

    drawing.value = false
    await wrapper.vm.$nextTick()
    expect(store.editor).toBeNull()

    drawing.value = true
    await wrapper.vm.$nextTick()
    expect(store.editor).not.toBeNull()

    wrapper.unmount()
    expect(store.editor).toBeNull()
  })

  it('refuses a click past the cap — a church has one pin', () => {
    const { points } = mountField({ kind: 'pins', max: 1, points: [A] })
    const store = useMapStore()

    store.editorAdd({ lat: 41.23, lng: 13.59 })

    expect(points.value).toEqual([A])
    expect(store.editor?.label).toContain('toglilo per sceglierne un altro')
  })

  it('never lends the map for a translation, which shows the original’s place', () => {
    mountField({ kind: 'route', points: [A], readonly: true })

    expect(useMapStore().editor).toBeNull()
  })

  it('reorders a route’s stops with buttons, since their order is the line', async () => {
    const { wrapper, points } = mountField({ kind: 'route', points: [A, B] })

    await wrapper.get('button[aria-label="Sposta la tappa 2 prima della 1"]').trigger('click')

    expect(points.value.map((point) => point.label)).toEqual(['Arrivo', 'Partenza'])
  })

  it('takes typed coordinates — the keyboard path a map click does not have', async () => {
    const { wrapper, points } = mountField({ kind: 'route' })

    await wrapper.get('#test-manual-lat').setValue('41.2139')
    await wrapper.get('#test-manual-lng').setValue('13.5711')
    await wrapper.get('#test-manual-label').setValue('Duomo')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Aggiungi tappa')!
      .trigger('click')

    expect(points.value).toEqual([{ lat: 41.2139, lng: 13.5711, label: 'Duomo' }])
  })

  it('hears "Fatto" from the map’s banner', () => {
    const { done } = mountField({ kind: 'route' })

    useMapStore().editorDone()

    expect(done.value).toBe(1)
  })
})
