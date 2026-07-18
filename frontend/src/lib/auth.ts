import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

import { useUserStore } from '@/stores/user'

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

// M4 auth hardening: access tokens last 60 minutes, so any request can meet an
// expired one. On a 401 this interceptor refreshes the token once (single
// flight across concurrent requests) and replays the original request.
export function setupAuthInterceptor() {
  let refreshing: Promise<boolean> | null = null

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
      config.headers.set('Authorization', 'Bearer ' + userStore.user.access)
      return axios(config)
    },
  )
}
