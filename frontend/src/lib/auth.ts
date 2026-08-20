import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

import { useUserStore } from '@/stores/user'

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

// M4 auth hardening: access tokens last 60 minutes, so any request can meet an
// expired one. On a 401 this interceptor refreshes the token once (single
// flight across concurrent requests) and replays the original request.
export function setupAuthInterceptor() {
  let refreshing: Promise<boolean> | null = null

  // The header used to be assigned in three places with three spellings
  // (App.vue, LoginView, the store's refreshToken), which is how a logged-out
  // tab kept sending a stale token. One request interceptor reading the store
  // is the whole policy now (TD-32).
  axios.interceptors.request.use((config) => {
    const { access } = useUserStore().user
    if (access) {
      config.headers.set('Authorization', 'Bearer ' + access)
    } else {
      config.headers.delete('Authorization')
    }
    return config
  })

  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetriableConfig | undefined
      const userStore = useUserStore()

      const url = config?.url ?? ''
      const isAuthEndpoint =
        url.includes('/api/users/login/') || url.includes('/api/users/refresh/')

      if (
        error.response?.status !== 401 ||
        !config ||
        config._retried ||
        isAuthEndpoint ||
        !userStore.user.refresh
      ) {
        return Promise.reject(error)
      }

      refreshing =
        refreshing ??
        userStore.refreshToken().finally(() => {
          refreshing = null
        })

      if (!(await refreshing)) {
        return Promise.reject(error)
      }

      config._retried = true
      // The request interceptor re-reads the refreshed token on the replay.
      return axios(config)
    },
  )
}
