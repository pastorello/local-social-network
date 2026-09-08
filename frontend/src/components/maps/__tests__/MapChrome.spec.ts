import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import MapChrome from '../MapChrome.vue'

describe('MapChrome', () => {
  it('opens and closes from its own button', async () => {
    const wrapper = mount(MapChrome, { props: { open: false } })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update:open')?.[0]).toEqual([true])
  })

  it('closes on Escape pressed on the trigger, not only inside the panel', async () => {
    const wrapper = mount(MapChrome, { props: { open: true } })

    await wrapper.find('button').trigger('keydown.esc')

    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })

  it('gives focus back to the button that opened it', async () => {
    const wrapper = mount(MapChrome, { props: { open: true }, attachTo: document.body })

    await wrapper.find('#map-chrome-panel').trigger('keydown.esc')

    // Closing the panel while focus is inside it otherwise drops the reader
    // at the top of the document, which is the whole complaint.
    expect(document.activeElement).toBe(wrapper.find('button').element)
    wrapper.unmount()
  })
})
