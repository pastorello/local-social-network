import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import ActionButton from '../ActionButton.vue'

const stub = { template: '<div />' }
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/chiese/nuova', name: 'chiesecreate', component: stub }],
})

describe('ActionButton', () => {
  it('is a button by default', () => {
    const wrapper = mount(ActionButton, { slots: { default: 'Salva' } })

    expect(wrapper.element.tagName).toBe('BUTTON')
  })

  it('is a link when it navigates — one control, one tab stop', async () => {
    router.push('/chiese/nuova')
    await router.isReady()
    const wrapper = mount(ActionButton, {
      props: { to: { name: 'chiesecreate' } },
      slots: { default: 'Nuova scheda' },
      global: { plugins: [router] },
    })

    // The two list views used to wrap this in a RouterLink, which is a
    // <button> inside an <a>: two stops for one control, announced twice.
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('href')).toBe('/chiese/nuova')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('looks the same either way', async () => {
    router.push('/chiese/nuova')
    await router.isReady()
    const asButton = mount(ActionButton, { slots: { default: 'x' } })
    const asLink = mount(ActionButton, {
      props: { to: '/chiese/nuova' },
      slots: { default: 'x' },
      global: { plugins: [router] },
    })

    for (const shared of ['rounded-lg', 'bg-sea', 'text-white']) {
      expect(asButton.classes()).toContain(shared)
      expect(asLink.classes()).toContain(shared)
    }
  })
})
