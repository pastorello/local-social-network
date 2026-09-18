import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppHeader from '../AppHeader.vue'
import App from '@/App.vue'
import { useUserStore } from '@/stores/user'

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' }, meta: { fullBleed: true } },
      { path: '/profile/:id', name: 'profile', component: { template: '<div />' } },
      { path: '/:pathMatch(.*)*', component: { template: '<div>pagina</div>' } },
    ],
  })

const mountHeader = async (signedIn = false) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (signedIn) {
    const user = useUserStore().user
    user.isAuthenticated = true
    user.id = 'u1'
    user.name = 'Maria Conte'
  }
  const router = makeRouter()
  router.push('/')
  await router.isReady()
  return mount(AppHeader, { global: { plugins: [pinia, router] }, attachTo: document.body })
}

// jsdom has no matchMedia, and useIsDesktop defaults to the wide layout
// without it; this installs one so the phone's menu can be mounted too.
const stubViewport = (isDesktop: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({
      matches: isDesktop,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
}

describe('the menu (spec/design.md D14)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    // @ts-expect-error — putting jsdom back the way it was found
    delete window.matchMedia
  })

  it('is Mappa, Schede, Il progetto and Accedi — and not the polls, nor a search', async () => {
    const wrapper = await mountHeader()
    const nav = wrapper.get('nav[aria-label="Principale"]')

    expect(nav.text()).toContain('Mappa')
    expect(nav.text()).toContain('Schede')
    expect(nav.find('a[href="/il-progetto"]').exists()).toBe(true)
    expect(nav.find('a[href="/login"]').text()).toBe('Accedi')
    expect(nav.find('a[href="/polls"]').exists()).toBe(false)
    expect(nav.find('input[type="search"]').exists()).toBe(false)
  })

  it('puts a signed-in collaborator’s profile, the users and Esci behind the avatar', async () => {
    const wrapper = await mountHeader(true)

    const trigger = wrapper.get('button[aria-label="Il tuo account: Maria Conte"]')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('Esci')

    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('a[href="/profile/u1"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/users"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Esci')
  })

  it('closes the account menu on Escape and gives focus back to the avatar', async () => {
    const wrapper = await mountHeader(true)
    const trigger = wrapper.get('button[aria-label="Il tuo account: Maria Conte"]')
    await trigger.trigger('click')

    await wrapper.get('a[href="/users"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
  })

  it('on a phone keeps the wordmark and Schede in the pill and the rest behind Menu', async () => {
    stubViewport(false)
    const wrapper = await mountHeader()

    expect(wrapper.find('a[href="/il-progetto"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="Menu"]').trigger('click')

    expect(wrapper.find('a[href="/il-progetto"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
  })
})

describe('the shell', () => {
  it('carries no footer on any page: the credits are Il progetto (D21)', async () => {
    const router = makeRouter()
    router.push('/polls')
    await router.isReady()
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
        // No unit test mounts a real Leaflet map (jsdom cannot load its
        // marker PNGs); HomeView would fire the map store's requests.
        stubs: { AppHeader: true, AppToast: true, MapStage: true, HomeView: true },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('pagina')
    expect(wrapper.find('footer').exists()).toBe(false)
  })
})
