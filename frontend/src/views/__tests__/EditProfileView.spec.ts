import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import EditProfileView from '../EditProfileView.vue'

describe('EditProfileView', () => {
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
})
