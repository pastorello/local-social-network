import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick, ref } from 'vue'

import { useMapFocus } from '../useMapFocus'
import { useMapStore, type MapFocus } from '@/stores/map'

const FOCUS: MapFocus = {
  id: 'c1',
  type: 'chiese',
  points: [{ lat: 41.2, lng: 13.5, label: '' }],
  route: [],
}

describe('useMapFocus (spec/design.md D16)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('hands the map the open page’s place, follows it, and lets go of it on close', async () => {
    const focus = ref<MapFocus | null>(null)
    const Page = defineComponent({
      setup() {
        useMapFocus(() => focus.value)
        return () => null
      },
    })

    const wrapper = mount(Page)
    const store = useMapStore()
    expect(store.focus).toBeNull()

    // The page's card arrives after its request resolves.
    focus.value = FOCUS
    await nextTick()
    expect(store.focus).toEqual(FOCUS)

    wrapper.unmount()
    expect(store.focus).toBeNull()
  })
})
