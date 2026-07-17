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
  avatar: string | null
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
  avatar: string | null
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
      avatar: null,
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
        this.user.avatar = localStorage.getItem('user.avatar')
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
      this.user.refresh = null
      this.user.access = null
      this.user.isAuthenticated = false
      this.user.id = null
      this.user.name = null
      this.user.email = null
      this.user.role = null
      this.user.avatar = null

      localStorage.setItem('user.access', '')
      localStorage.setItem('user.refresh', '')
      localStorage.setItem('user.id', '')
      localStorage.setItem('user.name', '')
      localStorage.setItem('user.email', '')
      localStorage.setItem('user.role', '')
      localStorage.setItem('user.avatar', '')
    },

    setUserInfo(user: UserInfo) {
      this.user.id = user.id
      this.user.name = user.name
      this.user.email = user.email
      this.user.role = user.role
      this.user.avatar = user.avatar

      localStorage.setItem('user.id', this.user.id ?? '')
      localStorage.setItem('user.name', this.user.name ?? '')
      localStorage.setItem('user.email', this.user.email ?? '')
      localStorage.setItem('user.role', this.user.role ?? '')
      localStorage.setItem('user.avatar', this.user.avatar ?? '')
    },

    refreshToken() {
      axios
        .post('/api/users/refresh/', {
          refresh: this.user.refresh,
        })
        .then((response) => {
          this.user.access = response.data.access

          localStorage.setItem('user.access', response.data.access)

          axios.defaults.headers.common['Authorization'] = 'Bearer ' + response.data.access
        })
        .catch(() => {
          this.removeToken()
        })
    },
  },
})
