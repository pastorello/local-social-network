import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref } from 'vue'

import StopsField from '../StopsField.vue'
import type { StopDraft } from '@/lib/tours'
import { useMapStore } from '@/stores/map'

const features = [
  {
    id: 'ch1',
    type: 'chiese',
    title: 'Duomo',
    is_published: true,
    cover: null,
    points: [{ lat: 41.21, lng: 13.57, label: '' }],
    route: [],
    zones: [],
  },
  {
    id: 'lu1',
    type: 'luoghi',
    title: 'Forno',
    is_published: true,
    cover: null,
    points: [
      { lat: 41.2, lng: 13.5, label: 'Via Indipendenza' },
      { lat: 41.22, lng: 13.58, label: 'Porto' },
    ],
    route: [],
    zones: [],
  },
]

const mountField = () => {
  const stops = ref<StopDraft[]>([])
  const Host = defineComponent({
    setup: () => () =>
      h(StopsField, {
        modelValue: stops.value,
        'onUpdate:modelValue': (next: StopDraft[]) => (stops.value = next),
        drawing: true,
        joined: true,
      }),
  })
  return { wrapper: mount(Host), stops }
}

describe('StopsField — stops picked on the map (spec itinerari.md I8)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useMapStore().features = features
  })

  it('lends the map a stops editor, and a click on a card’s pin makes it the next stop', async () => {
    const { stops } = mountField()
    const store = useMapStore()

    expect(store.editor?.kind).toBe('stops')
    expect(store.editor?.joined).toBe(true)
    expect(store.editor?.label).toContain('tappa 1')

    store.editorPick({ type: 'chiese', id: 'ch1' })
    expect(stops.value.map((stop) => stop.card)).toEqual(['ch1'])
    await Promise.resolve()
    expect(store.editor?.points).toEqual([{ lat: 41.21, lng: 13.57, label: '' }])
  })

  it('has a keyboard path: pick a card from the list, then choose which of its pins', async () => {
    const { wrapper, stops } = mountField()

    await wrapper.get('#stop-pick').setValue('lu1')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Aggiungi tappa')!
      .trigger('click')
    expect(stops.value.map((stop) => stop.title)).toEqual(['Forno'])

    await wrapper.get('#stop-point-0').setValue('1')
    expect(stops.value[0]?.point_index).toBe(1)
  })

  it('removes a stop by its number', async () => {
    const { wrapper, stops } = mountField()
    const store = useMapStore()
    // Two clicks are two events: the field re-renders in between.
    store.editorPick({ type: 'chiese', id: 'ch1' })
    await wrapper.vm.$nextTick()
    store.editorPick({ type: 'luoghi', id: 'lu1' })
    await wrapper.vm.$nextTick()

    await wrapper.get('button[aria-label="Rimuovi la tappa 1"]').trigger('click')
    expect(stops.value.map((stop) => stop.card)).toEqual(['lu1'])
  })

  // A business has a place, and is still never a stop: a tour that chose one
  // bar among many would rank them (cosa-fare.md CF40, ADR-0010). The API
  // refuses it; the form does not offer it, on the map or in the list.
  it('never offers a business as a stop, by click or from the list', async () => {
    const store = useMapStore()
    store.features = [
      ...features,
      {
        id: 'at1',
        type: 'attivita',
        title: 'Bar del porto',
        is_published: true,
        cover: null,
        points: [{ lat: 41.215, lng: 13.57, label: '' }],
        route: [],
        zones: [],
        kind: 'beve',
      },
    ]
    const { wrapper, stops } = mountField()

    store.editorPick({ type: 'attivita', id: 'at1' })
    expect(stops.value).toEqual([])
    const options = wrapper.findAll('#stop-pick option').map((option) => option.text())
    expect(options).not.toContain('Bar del porto')
    expect(
      wrapper.findAll('#stop-pick optgroup').map((group) => group.attributes('label')),
    ).toEqual(['Chiese', 'Luoghi'])
  })
})
