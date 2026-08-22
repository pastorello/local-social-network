import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import PasswordResetConfirmView from '../PasswordResetConfirmView.vue'

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
      {
        path: '/reimposta-password/:token',
        name: 'passwordresetconfirm',
        component: PasswordResetConfirmView,
      },
    ],
  })

describe('PasswordResetConfirmView', () => {
  it('renders a password-only form', async () => {
    const router = makeRouter()
    router.push('/reimposta-password/some-token')
    await router.isReady()

    const wrapper = mount(PasswordResetConfirmView, {
      global: { plugins: [createPinia(), router] },
    })

    expect(wrapper.find('h1').text()).toContain('Reimposta password')
    expect(wrapper.findAll('input[type="password"]')).toHaveLength(2)
  })
})
