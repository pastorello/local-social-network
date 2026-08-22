import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import CollaboraView from '../CollaboraView.vue'

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
      { path: '/collabora', name: 'collabora', component: stub },
    ],
  })

describe('CollaboraView', () => {
  it('renders the collaboration request form with no password fields', () => {
    const wrapper = mount(CollaboraView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    expect(wrapper.find('h1').text()).toContain('Collabora con noi')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
  })

  it('renders the honeypot input visually hidden and out of tab order', () => {
    const wrapper = mount(CollaboraView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    const honeypot = wrapper.find('input[autocomplete="off"]')
    expect(honeypot.exists()).toBe(true)
    expect(honeypot.attributes('tabindex')).toBe('-1')
    expect(honeypot.element.closest('[aria-hidden="true"]')).not.toBeNull()
  })
})
