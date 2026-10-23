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
      { path: '/le-mie-schede', name: 'lemieschede', component: stub },
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

  const me = {
    data: {
      id: 'u1',
      name: 'Autore',
      email: 'autore@example.com',
      role: 'citizen',
      avatarURL: null,
    },
  }
  // The collaborator's first card, as /api/content/mine/ sends it: drafts first.
  const firstCard = (isPublished: boolean | null) => ({
    data: { results: isPublished === null ? [] : [{ id: 'c1', is_published: isPublished }] },
  })

  const signIn = async (from: string) => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { access: 'a', refresh: 'r' } })
    const router = makeRouter()
    await router.push(from)
    const wrapper = mount(LoginView, {
      global: { plugins: [createPinia(), router] },
    })

    await wrapper.get('input[type="email"]').setValue('autore@example.com')
    await wrapper.get('input[type="password"]').setValue('password123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    return router.currentRoute.value.fullPath
  }

  // TD-48: the router guard sends a visitor to /login?redirect=… (login.cy.ts
  // covers that leg); this is the other one — signing in lands them back on
  // the page they asked for, query and all, whatever they have unfinished.
  it('after signing in from a redirect, lands where the visitor was going', async () => {
    vi.mocked(axios.get).mockReset().mockResolvedValueOnce(me)

    expect(await signIn('/login?redirect=%2Ffeste%2Fabc%3Fedit%3D1')).toBe('/feste/abc?edit=1')
    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  // Review PR-13 (C-02): with nowhere asked for, a collaborator with a draft
  // lands on their own cards — the work they came back to finish — and
  // anyone else on the map, as before.
  it.each([
    ['a draft', firstCard(false), '/le-mie-schede'],
    ['only published cards', firstCard(true), '/'],
    ['no card at all', firstCard(null), '/'],
  ])('after signing in with %s, lands on %s', async (_, mine, to) => {
    vi.mocked(axios.get).mockReset().mockResolvedValueOnce(me).mockResolvedValueOnce(mine)

    expect(await signIn('/login')).toBe(to)
    expect(axios.get).toHaveBeenLastCalledWith('/api/content/mine/', {
      params: { page_size: 1 },
    })
  })

  it('lands on the map when its own cards cannot be had: signing in does not fail over it', async () => {
    vi.mocked(axios.get)
      .mockReset()
      .mockResolvedValueOnce(me)
      .mockRejectedValueOnce(new Error('rete'))

    expect(await signIn('/login')).toBe('/')
  })
})
