import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import axios from 'axios'
import { createRouter, createMemoryHistory } from 'vue-router'

import PasswordResetConfirmView from '../PasswordResetConfirmView.vue'
import { useUserStore } from '@/stores/user'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({ data: {} })),
    defaults: { headers: { common: {} } },
  },
}))

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

  // Whoever was signed in on this browser must not survive it: a reset sends the reader to sign in with the new password,
  // and staying signed in as the previous account meant the new person could
  // go on to write a card under someone else's name (spec accounts.md).
  const submitWithSession = async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useUserStore()
    store.setToken({ access: 'previous-access', refresh: 'previous-refresh' })

    const router = makeRouter()
    router.push('/reimposta-password/some-token')
    await router.isReady()

    const wrapper = mount(PasswordResetConfirmView, { global: { plugins: [pinia, router] } })
    await wrapper.find('#reset-confirm-password1').setValue('UnaPassword2026!')
    await wrapper.find('#reset-confirm-password2').setValue('UnaPassword2026!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    return { store, router }
  }

  beforeEach(() => {
    localStorage.clear()
    vi.mocked(axios.post).mockReset()
    vi.mocked(axios.post).mockResolvedValue({ data: {} })
  })

  it('ends the session that was open on this browser once it succeeds', async () => {
    const { store, router } = await submitWithSession()

    expect(axios.post).toHaveBeenCalledWith('/api/users/confirmpasswordreset/', expect.anything())
    expect(store.user.isAuthenticated).toBe(false)
    expect(localStorage.getItem('user.refresh')).toBe('')
    expect(axios.post).toHaveBeenCalledWith('/api/users/logout/', { refresh: 'previous-refresh' })
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('leaves the session alone when the link is refused', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce({
      response: {
        status: 400,
        data: { detail: 'Dati non validi.', fields: { token: ['Link non valido o scaduto.'] } },
      },
    })

    const { store } = await submitWithSession()

    expect(store.user.isAuthenticated).toBe(true)
    expect(axios.post).not.toHaveBeenCalledWith('/api/users/logout/', expect.anything())
  })
})
