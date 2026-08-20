import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'

import { setupAuthInterceptor } from '../auth'
import { useUserStore } from '@/stores/user'

const state = vi.hoisted(() => ({
  onRejected: undefined as undefined | ((error: unknown) => Promise<unknown>),
  onRequest: undefined as undefined | ((config: unknown) => unknown),
}))

vi.mock('axios', () => {
  const axiosFn = Object.assign(
    vi.fn(() => Promise.resolve({ data: 'retried-response' })),
    {
      interceptors: {
        request: {
          use: (onRequest: (config: unknown) => unknown) => {
            state.onRequest = onRequest
          },
        },
        response: {
          use: (_onFulfilled: unknown, onRejected: (error: unknown) => Promise<unknown>) => {
            state.onRejected = onRejected
          },
        },
      },
      post: vi.fn(),
      defaults: { headers: { common: {} } },
    },
  )
  return { default: axiosFn }
})

const make401 = (url: string) => ({
  response: { status: 401 },
  config: { url, headers: { set: vi.fn() } },
})

describe('setupAuthInterceptor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.mocked(axios).mockClear()
    vi.mocked(axios.post).mockReset()
    setupAuthInterceptor()
  })

  it('refreshes the token on 401 and replays the original request', async () => {
    const store = useUserStore()
    store.setToken({ access: 'stale-access', refresh: 'refresh-1' })
    vi.mocked(axios.post).mockResolvedValue({
      data: { access: 'fresh-access', refresh: 'refresh-2' },
    })

    const error = make401('/api/polls/')
    const result = await state.onRejected!(error)

    expect(axios.post).toHaveBeenCalledWith('/api/users/refresh/', { refresh: 'refresh-1' })
    expect(store.user.refresh).toBe('refresh-2') // rotated token persisted
    expect(store.user.access).toBe('fresh-access')
    // The replay goes back through axios, so the request interceptor attaches
    // the refreshed token — this handler no longer sets the header itself
    // (TD-32). That attachment is covered by its own tests below.
    expect(axios).toHaveBeenCalledWith(error.config)
    expect(result).toEqual({ data: 'retried-response' })
  })

  it('does not try to refresh when the 401 comes from login or refresh itself', async () => {
    const store = useUserStore()
    store.setToken({ access: 'a', refresh: 'r' })

    await expect(state.onRejected!(make401('/api/users/login/'))).rejects.toBeTruthy()
    await expect(state.onRejected!(make401('/api/users/refresh/'))).rejects.toBeTruthy()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('gives up and clears the session when the refresh fails', async () => {
    const store = useUserStore()
    store.setToken({ access: 'stale-access', refresh: 'expired-refresh' })
    vi.mocked(axios.post).mockRejectedValue(new Error('401'))

    const error = make401('/api/reports/')
    await expect(state.onRejected!(error)).rejects.toBe(error)

    expect(store.user.isAuthenticated).toBe(false)
    expect(axios).not.toHaveBeenCalled() // no retry without a valid session
  })

  it('retries a request only once', async () => {
    const store = useUserStore()
    store.setToken({ access: 'a', refresh: 'r' })

    const error = make401('/api/polls/') as ReturnType<typeof make401> & {
      config: { _retried?: boolean }
    }
    error.config._retried = true

    await expect(state.onRejected!(error)).rejects.toBe(error)
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('attaches the access token to every outgoing request', () => {
    const store = useUserStore()
    store.setToken({ access: 'access-token', refresh: 'refresh-token' })
    const headers = { set: vi.fn(), delete: vi.fn() }

    state.onRequest!({ headers })

    // Three places used to assign this by hand; now there is one (TD-32).
    expect(headers.set).toHaveBeenCalledWith('Authorization', 'Bearer access-token')
  })

  it('sends no Authorization header when there is no session', () => {
    const headers = { set: vi.fn(), delete: vi.fn() }

    state.onRequest!({ headers })

    expect(headers.set).not.toHaveBeenCalled()
    expect(headers.delete).toHaveBeenCalledWith('Authorization')
  })
})
