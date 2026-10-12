import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'

import UsersView from '../UsersView.vue'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

const page = { count: 0, next: null, previous: null, results: [] }

describe('UsersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: page })
  })

  // The search is the shared SearchBar now, not a verbatim copy of it (TD-31).
  it('searches the directory with what was typed in the shared search bar', async () => {
    const wrapper = mount(UsersView, {
      global: {
        plugins: [
          createPinia(),
          createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: {} }] }),
        ],
      },
    })
    await flushPromises()

    await wrapper.get('input[type="search"]').setValue('Maria')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'SearchBar' }).exists()).toBe(true)
    expect(axios.get).toHaveBeenLastCalledWith('/api/users/list/', { params: { q: 'Maria' } })
  })
})
