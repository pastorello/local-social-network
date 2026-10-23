import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'

import EditProfileView from '../EditProfileView.vue'
import { useUserStore } from '@/stores/user'

vi.mock('axios')

describe('EditProfileView', () => {
  afterEach(() => localStorage.clear())

  // useFileUpload, not a hand-rolled ref, and with it a preview (TD-31).
  it('previews a picked avatar before it is saved', async () => {
    const wrapper = mount(EditProfileView, {
      global: {
        plugins: [
          createPinia(),
          createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: {} }] }),
        ],
      },
    })
    expect(wrapper.find('img[alt="Anteprima del nuovo avatar"]').exists()).toBe(false)

    const input = wrapper.get('#editprofile-avatar')
    const file = new File(['png'], 'io.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    // FileReader reports on a later task.
    await new Promise((resolve) => setTimeout(resolve, 20))
    await flushPromises()

    const preview = wrapper.get('img[alt="Anteprima del nuovo avatar"]')
    expect(preview.attributes('src')).toMatch(/^data:image\/png;base64,/)
  })

  // Review PR-22: no button of the app imitates the browser's Back.
  it('goes up to the profile once saved, not back', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useUserStore().setUserInfo({
      id: 'u1',
      name: 'Anna',
      email: 'anna@example.com',
      role: 'citizen',
      avatarURL: null,
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: {} },
        { path: '/profile/:id', name: 'profile', component: {} },
      ],
    })
    const push = vi.spyOn(router, 'push')
    const back = vi.spyOn(router, 'back')
    vi.mocked(axios.post).mockResolvedValue({ data: { user: { avatarURL: null } } })
    const wrapper = mount(EditProfileView, { global: { plugins: [pinia, router] } })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'profile', params: { id: 'u1' } })
    expect(back).not.toHaveBeenCalled()
  })
})
