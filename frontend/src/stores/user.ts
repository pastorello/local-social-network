import { defineStore } from 'pinia'
import axios from 'axios'

export type UserRole = 'citizen' | 'admin'

interface UserState {
  isAuthenticated: boolean
  id: string | null
  name: string | null
  email: string | null
  role: UserRole | null
  access: string | null
  refresh: string | null
  avatarURL: string | null
}

interface TokenPair {
  access: string
  refresh: string
}

interface UserInfo {
  id: string
  name: string
  email: string
  role: UserRole
  avatarURL: string | null
}

export const useUserStore = defineStore('user', {
  state: (): { user: UserState } => ({
    user: {
      isAuthenticated: false,
      id: null,
      name: null,
      email: null,
      role: null,
      access: null,
      refresh: null,
      avatarURL: null,
    },
  }),

  actions: {
    initStore() {
      if (localStorage.getItem('user.access')) {
        this.user.access = localStorage.getItem('user.access')
        this.user.refresh = localStorage.getItem('user.refresh')
        this.user.id = localStorage.getItem('user.id')
        this.user.name = localStorage.getItem('user.name')
        this.user.email = localStorage.getItem('user.email')
        this.user.role = (localStorage.getItem('user.role') as UserRole) || null
        this.user.avatarURL = localStorage.getItem('user.avatarURL')
        this.user.isAuthenticated = true

        this.refreshToken()
      }
    },

    setToken(data: TokenPair) {
      this.user.access = data.access
      this.user.refresh = data.refresh
      this.user.isAuthenticated = true

      localStorage.setItem('user.access', data.access)
      localStorage.setItem('user.refresh', data.refresh)
    },

    removeToken() {
      // The request interceptor reads the store, so clearing the state below is
      // what stops the token being sent (TD-32). This stays as belt and braces
      // for any default set outside that path (TD-20).
      delete axios.defaults.headers.common['Authorization']

      this.user.refresh = null
      this.user.access = null
      this.user.isAuthenticated = false
      this.user.id = null
      this.user.name = null
      this.user.email = null
      this.user.role = null
      this.user.avatarURL = null

      localStorage.setItem('user.access', '')
      localStorage.setItem('user.refresh', '')
      localStorage.setItem('user.id', '')
      localStorage.setItem('user.name', '')
      localStorage.setItem('user.email', '')
      localStorage.setItem('user.role', '')
      localStorage.setItem('user.avatarURL', '')
    },

    setUserInfo(user: UserInfo) {
      this.user.id = user.id
      this.user.name = user.name
      this.user.email = user.email
      this.user.role = user.role
      this.user.avatarURL = user.avatarURL

      localStorage.setItem('user.id', this.user.id ?? '')
      localStorage.setItem('user.name', this.user.name ?? '')
      localStorage.setItem('user.email', this.user.email ?? '')
      localStorage.setItem('user.role', this.user.role ?? '')
      localStorage.setItem('user.avatarURL', this.user.avatarURL ?? '')
    },

    async logout(): Promise<void> {
      // Best effort: the server blacklists the refresh token so it cannot be
      // replayed for the rest of its 30-day life. A failure here must still log
      // the user out locally.
      const refresh = this.user.refresh
      if (refresh) {
        try {
          await axios.post('/api/users/logout/', { refresh })
        } catch {
          // already invalid, or offline — nothing useful to do
        }
      }
      this.removeToken()
    },

    async refreshToken(): Promise<boolean> {
      if (!this.user.refresh) return false

      try {
        const response = await axios.post('/api/users/refresh/', {
          refresh: this.user.refresh,
        })

        this.user.access = response.data.access
        localStorage.setItem('user.access', response.data.access)

        // M4 hardening: the backend rotates refresh tokens — keep the new one,
        // the old one is blacklisted server-side
        if (response.data.refresh) {
          this.user.refresh = response.data.refresh
          localStorage.setItem('user.refresh', response.data.refresh)
        }

        return true
      } catch {
        this.removeToken()
        return false
      }
    },
  },
})
