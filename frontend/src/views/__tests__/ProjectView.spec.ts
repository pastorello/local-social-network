import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import ProjectView from '../ProjectView.vue'

const mountProject = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  router.push('/il-progetto')
  await router.isReady()
  return mount(ProjectView, { global: { plugins: [router] } })
}

// Il progetto is the credits surface (spec/design.md D21) — what the footer
// carried until the map went under every page. These are the footer's own
// tests, moved with it.
describe('Il progetto', () => {
  it('links to every card type, so the archive is reachable from the credits', async () => {
    const wrapper = await mountProject()
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))

    for (const path of [
      '/feste',
      '/luoghi',
      '/chiese',
      '/ricette',
      '/personaggi',
      '/dialetto',
      '/libri',
    ]) {
      expect(hrefs).toContain(path)
    }
  })

  it('is where the polls and "Collabora con noi" are reached from (D14)', async () => {
    const wrapper = await mountProject()
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))

    expect(hrefs).toContain('/polls')
    expect(hrefs).toContain('/collabora')
    expect(hrefs).toContain('/itinerari')
  })

  it('states the editorial rule (D10) rather than showing a sponsor slot (D12)', async () => {
    const wrapper = await mountProject()

    expect(wrapper.text()).toContain('nessuna presenza è acquistata')
    // No invented endorsement: there is no patrocinio today, and a placeholder
    // would be the product claiming something that is not true (D11).
    expect(wrapper.text()).not.toMatch(/patrocinio|sponsor/i)
  })

  it('has the page’s one h1', async () => {
    const wrapper = await mountProject()

    expect(wrapper.findAll('h1').map((h) => h.text())).toEqual(['Il progetto'])
  })
})
