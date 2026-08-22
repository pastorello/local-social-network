import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import InviteAcceptView from '../InviteAcceptView.vue'

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
      { path: '/invito/:token', name: 'inviteaccept', component: InviteAcceptView },
    ],
  })

describe('InviteAcceptView', () => {
  it('renders a password-only form', async () => {
    const router = makeRouter()
    router.push('/invito/some-token')
    await router.isReady()

    const wrapper = mount(InviteAcceptView, {
      global: { plugins: [createPinia(), router] },
    })

    expect(wrapper.find('h1').text()).toContain('Attiva il tuo account')
    expect(wrapper.findAll('input[type="password"]')).toHaveLength(2)
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
  })
})
