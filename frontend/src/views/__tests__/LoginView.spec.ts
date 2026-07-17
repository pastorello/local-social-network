import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import LoginView from '../LoginView.vue'

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
      { path: '/signup', name: 'signup', component: stub },
    ],
  })

describe('LoginView', () => {
  it('renders the login form', () => {
    const wrapper = mount(LoginView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    expect(wrapper.find('h1').text()).toContain('Log in')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
