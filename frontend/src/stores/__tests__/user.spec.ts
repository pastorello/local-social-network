import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'

import { useUserStore } from '../user'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({ data: { access: 'refreshed-access' } })),
    defaults: { headers: { common: {} } },
  },
}))

describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.mocked(axios.post).mockClear()
  })

  it('setToken marks the user authenticated and persists both tokens', () => {
    const store = useUserStore()

    store.setToken({ access: 'access-token', refresh: 'refresh-token' })

    expect(store.user.isAuthenticated).toBe(true)
    expect(localStorage.getItem('user.access')).toBe('access-token')
    expect(localStorage.getItem('user.refresh')).toBe('refresh-token')
  })

  it('setUserInfo persists the profile fields, including the role', () => {
    const store = useUserStore()

    store.setUserInfo({
      id: 'user-1',
      name: 'Anna',
      email: 'anna@example.com',
      role: 'citizen',
      avatarURL: 'https://example.com/a.png',
    })

    expect(store.user.role).toBe('citizen')
    expect(localStorage.getItem('user.role')).toBe('citizen')
    expect(localStorage.getItem('user.name')).toBe('Anna')
  })

  it('removeToken clears the state and the persisted session', () => {
    const store = useUserStore()
    store.setToken({ access: 'a', refresh: 'r' })
    store.setUserInfo({
      id: 'user-1',
      name: 'Anna',
      email: 'anna@example.com',
      role: 'admin',
      avatarURL: null,
    })

    store.removeToken()

    expect(store.user.isAuthenticated).toBe(false)
    expect(store.user.id).toBeNull()
    expect(store.user.role).toBeNull()
    expect(localStorage.getItem('user.access')).toBe('')
    expect(localStorage.getItem('user.role')).toBe('')
  })

  it('initStore restores a persisted session and refreshes the access token', () => {
    localStorage.setItem('user.access', 'old-access')
    localStorage.setItem('user.refresh', 'stored-refresh')
    localStorage.setItem('user.id', 'user-1')
    localStorage.setItem('user.name', 'Anna')
    localStorage.setItem('user.email', 'anna@example.com')
    localStorage.setItem('user.role', 'admin')
    localStorage.setItem('user.avatarURL', 'x')

    const store = useUserStore()
    store.initStore()

    expect(store.user.isAuthenticated).toBe(true)
    expect(store.user.role).toBe('admin')
    expect(axios.post).toHaveBeenCalledWith('/api/users/refresh/', {
      refresh: 'stored-refresh',
    })
  })

  it('initStore does nothing without a persisted access token', () => {
    const store = useUserStore()
    store.initStore()

    expect(store.user.isAuthenticated).toBe(false)
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('refreshToken persists the rotated refresh token (M4 hardening)', async () => {
    const store = useUserStore()
    store.setToken({ access: 'old-access', refresh: 'old-refresh' })
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { access: 'new-access', refresh: 'new-refresh' },
    })

    const refreshed = await store.refreshToken()

    expect(refreshed).toBe(true)
    expect(store.user.access).toBe('new-access')
    expect(store.user.refresh).toBe('new-refresh')
    expect(localStorage.getItem('user.refresh')).toBe('new-refresh')
  })

  it('refreshToken clears the session when the refresh token is rejected', async () => {
    const store = useUserStore()
    store.setToken({ access: 'old-access', refresh: 'expired-refresh' })
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('401'))

    const refreshed = await store.refreshToken()

    expect(refreshed).toBe(false)
    expect(store.user.isAuthenticated).toBe(false)
    expect(localStorage.getItem('user.access')).toBe('')
  })

  it('removeToken stops axios from sending the old bearer token', () => {
    const store = useUserStore()
    store.setToken({ access: 'access-token', refresh: 'refresh-token' })
    axios.defaults.headers.common['Authorization'] = 'Bearer access-token'

    store.removeToken()

    // Until this was fixed, every request in the tab kept the logged-out user's
    // token until the page was reloaded (TD-20).
    expect(axios.defaults.headers.common['Authorization']).toBeUndefined()
  })

  it('logout asks the server to blacklist the refresh token', async () => {
    const store = useUserStore()
    store.setToken({ access: 'access-token', refresh: 'refresh-token' })

    await store.logout()

    expect(axios.post).toHaveBeenCalledWith('/api/users/logout/', { refresh: 'refresh-token' })
    expect(store.user.isAuthenticated).toBe(false)
  })

  it('logout still clears the session when the server call fails', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('offline'))
    const store = useUserStore()
    store.setToken({ access: 'access-token', refresh: 'refresh-token' })

    await store.logout()

    expect(store.user.isAuthenticated).toBe(false)
    expect(localStorage.getItem('user.refresh')).toBe('')
  })
})
