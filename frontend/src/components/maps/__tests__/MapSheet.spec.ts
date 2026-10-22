import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import MapSheet from '../MapSheet.vue'
import { useMapStore } from '@/stores/map'

describe('MapSheet tells the map how tall it is (review PR-5, M-01)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('at each stop it comes to rest on, and not once it is gone', async () => {
    const store = useMapStore()
    const wrapper = mount(MapSheet, { props: { title: 'La mappa di Gaeta' } })

    // It opens at its middle stop, 45% of the screen.
    expect(store.sheetHeight).toBe(0.45 * window.innerHeight)

    await wrapper.get('button').trigger('click')
    expect(store.sheetHeight).toBe(0.85 * window.innerHeight)

    await wrapper.get('button').trigger('click')
    // Its lowest stop is 5.5rem.
    expect(store.sheetHeight).toBe(88)

    wrapper.unmount()
    expect(store.sheetHeight).toBeNull()
  })
})
