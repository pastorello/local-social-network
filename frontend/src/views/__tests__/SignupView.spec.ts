import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import SignupView from '../SignupView.vue'

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

describe('SignupView', () => {
  it('renders the signup form with all four fields', () => {
    const wrapper = mount(SignupView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    expect(wrapper.find('h1').text()).toContain('Sign up')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.findAll('input[type="password"]')).toHaveLength(2)
  })
})
