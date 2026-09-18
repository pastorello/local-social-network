import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'

import App from '../../App.vue'
import AppFooter from '../AppFooter.vue'

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub, meta: { fullBleed: true } },
      { path: '/polls', name: 'polls', component: stub },
      { path: '/collabora', name: 'collabora', component: stub },
      { path: '/feste', name: 'festelist', component: stub },
      { path: '/luoghi', name: 'luoghilist', component: stub },
      { path: '/chiese', name: 'chieselist', component: stub },
      { path: '/ricette', name: 'ricettelist', component: stub },
      { path: '/personaggi', name: 'personaggilist', component: stub },
      { path: '/dialetto', name: 'dialettolist', component: stub },
      { path: '/libri', name: 'librilist', component: stub },
    ],
  })

const mountFooter = async () => {
  const router = makeRouter()
  router.push('/polls')
  await router.isReady()
  return mount(AppFooter, { global: { plugins: [router] } })
}

describe('AppFooter', () => {
  it('links to every card type, so the archive is reachable from the bottom of any page', async () => {
    const wrapper = await mountFooter()
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

  it('states the editorial rule (D10) rather than showing a sponsor slot (D12)', async () => {
    const wrapper = await mountFooter()

    expect(wrapper.text()).toContain('merito editoriale')
    expect(wrapper.text()).toContain('nessuna presenza è acquistata')
  })
})

describe('the shell', () => {
  const mountApp = async (path: string) => {
    const router = makeRouter()
    router.push(path)
    await router.isReady()
    return mount(App, {
      global: {
        plugins: [createPinia(), router],
        stubs: { AppHeader: true, AppToast: true },
      },
    })
  }

  it('omits the footer on a fullBleed route: the map home must not scroll (D3)', async () => {
    const wrapper = await mountApp('/')

    expect(wrapper.findComponent(AppFooter).exists()).toBe(false)
  })

  it('renders the footer everywhere else', async () => {
    const wrapper = await mountApp('/polls')

    expect(wrapper.findComponent(AppFooter).exists()).toBe(true)
  })
})
