import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import PanelBox from '../PanelBox.vue'

describe('PanelBox', () => {
  // The padding used to be a plain object built once from the prop, so a
  // changed `size` never reached the DOM (TD-31).
  it('follows its size when the prop changes', async () => {
    const wrapper = mount(PanelBox, { props: { size: 'small' } })
    expect(wrapper.classes()).toContain('p-4')

    await wrapper.setProps({ size: 'large' })

    expect(wrapper.classes()).toContain('p-12')
    expect(wrapper.classes()).not.toContain('p-4')
  })
})
