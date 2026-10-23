import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'

import ProfileView from '../ProfileView.vue'

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

const stub = { template: '<div />' }

const mountProfile = async () => {
  vi.mocked(axios.get).mockImplementation((url: string) =>
    Promise.resolve(
      url === '/api/reports/'
        ? {
            data: {
              count: 1,
              results: [
                {
                  id: 'r1',
                  title: 'Un titolo di segnalazione abbastanza lungo da andare a capo',
                  status: 'open',
                  category: { name: 'Strade' },
                  upvotes_count: 0,
                },
              ],
            },
          }
        : { data: { id: 'u1', name: 'Revisore Admin', avatarURL: null } },
    ),
  )
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile/:id', name: 'profile', component: ProfileView },
      { path: '/profile/edit', name: 'editprofile', component: stub },
      { path: '/reports/:id', name: 'reportdetail', component: stub },
    ],
  })
  await router.push('/profile/u1')
  const wrapper = mount(ProfileView, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return wrapper
}

// Luca's report on PR-11: in a quarter of the wide panel (~170px) the fixed
// 200px avatar and the display-size name ran out of their column and under
// the reports beside it. The overflow itself is measured in a browser
// (a11y.cy.ts, at 1440, 1024 and 390px); this pins the shape that prevents it.
describe('ProfileView', () => {
  it('is one column: face, name and reports in one box, no grid beside it', async () => {
    const wrapper = await mountProfile()

    const box = wrapper.get('h1').element.closest('.border-hairline')
    expect(box).not.toBeNull()
    expect(box!.contains(wrapper.get('[role="img"]').element)).toBe(true)
    expect(box!.contains(wrapper.get('h2').element)).toBe(true)
    expect(wrapper.find('[class*="grid-cols"]').exists()).toBe(false)
    expect(wrapper.find('[class*="col-span"]').exists()).toBe(false)
  })

  it('never lets the avatar be wider than its box, and wraps the name', async () => {
    const wrapper = await mountProfile()

    expect(wrapper.get('[role="img"]').classes()).toEqual(
      expect.arrayContaining(['max-w-full', 'aspect-square']),
    )
    expect(wrapper.get('h1').text()).toBe('Revisore Admin')
    expect(wrapper.get('h1').classes()).toEqual(
      expect.arrayContaining(['wrap-break-word', 'text-pretty']),
    )
  })
})
