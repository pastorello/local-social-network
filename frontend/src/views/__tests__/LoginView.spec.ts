import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'

import LoginView from '../LoginView.vue'

vi.mock('axios', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}))

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
      { path: '/collabora', name: 'collabora', component: stub },
      { path: '/password-dimenticata', name: 'passwordresetrequest', component: stub },
      { path: '/feste/:id', name: 'festedetail', component: stub },
    ],
  })

describe('LoginView', () => {
  it('renders the login form', () => {
    const wrapper = mount(LoginView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    expect(wrapper.find('h1').text()).toContain('Accedi')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('pairs every label with its input', () => {
    const wrapper = mount(LoginView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    for (const label of wrapper.findAll('label')) {
      const forAttr = label.attributes('for')
      expect(forAttr).toBeTruthy()
      expect(wrapper.find(`#${forAttr}`).exists()).toBe(true)
    }
  })

  it('points a rejected field at its own message instead of a list at the foot', async () => {
    const wrapper = mount(LoginView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    await wrapper.find('input[type="email"]').setValue('non-una-email')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')

    const email = wrapper.find('input[type="email"]')
    expect(email.attributes('aria-invalid')).toBe('true')

    // The description has to resolve to the element carrying the message —
    // half-wiring it (an id that points at nothing) is the failure mode this
    // test exists for.
    const describedBy = email.attributes('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(wrapper.find(`#${describedBy}`).text()).not.toBe('')

    // And the password, which was fine, says nothing.
    expect(wrapper.find('input[type="password"]').attributes('aria-invalid')).toBeUndefined()
  })

  // TD-48: the router guard sends a visitor to /login?redirect=… (login.cy.ts
  // covers that leg); this is the other one — signing in lands them back on
  // the page they asked for, query and all, not on the map.
  it.each([
    ['/login?redirect=%2Ffeste%2Fabc%3Fedit%3D1', '/feste/abc?edit=1'],
    ['/login', '/'],
  ])('after signing in from %s, lands on %s', async (from, to) => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { access: 'a', refresh: 'r' } })
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        id: 'u1',
        name: 'Autore',
        email: 'autore@example.com',
        role: 'citizen',
        avatarURL: null,
      },
    })
    const router = makeRouter()
    await router.push(from)
    const wrapper = mount(LoginView, {
      global: { plugins: [createPinia(), router] },
    })

    await wrapper.get('input[type="email"]').setValue('autore@example.com')
    await wrapper.get('input[type="password"]').setValue('password123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(to)
  })
})
