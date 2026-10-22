import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppHeader from '../AppHeader.vue'
import App from '@/App.vue'
import { useMapStore } from '@/stores/map'
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

const mountHeader = async (signedIn = false, avatarURL: string | null = null) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (signedIn) {
    const user = useUserStore().user
    user.isAuthenticated = true
    user.id = 'u1'
    user.name = 'Maria Conte'
    user.avatarURL = avatarURL
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

  it('is Mappa, Schede, Itinerari, Il progetto and Accedi — not the polls, nor a search', async () => {
    const wrapper = await mountHeader()
    const nav = wrapper.get('nav[aria-label="Principale"]')

    expect(nav.text()).toContain('Mappa')
    expect(nav.text()).toContain('Schede')
    expect(nav.find('a[href="/itinerari"]').text()).toBe('Itinerari')
    // «Cosa si può fare qui» (spec cosa-fare.md Part −1, D6): in the pill on a
    // wide screen, behind Menu on a phone.
    expect(nav.find('a[href="/cosa-fare"]').text()).toBe('Cosa fare')
    expect(nav.find('a[href="/il-progetto"]').exists()).toBe(true)
    expect(nav.find('a[href="/login"]').text()).toBe('Accedi')
    expect(nav.find('a[href="/polls"]').exists()).toBe(false)
    expect(nav.find('input[type="search"]').exists()).toBe(false)
  })

  it('puts a signed-in collaborator’s profile, the users and Esci behind the avatar', async () => {
    const wrapper = await mountHeader(true)

    const trigger = wrapper.get('button[aria-label^="Il tuo account: Maria Conte"]')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('Esci')

    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('a[href="/profile/u1"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/users"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Esci')
  })

  // Reports are for people with an account (decided 2026-10-22, spec
  // reports-and-polls.md R1), and so is the way to file one. From the home
  // itself there is no route change to close the menu, so it closes itself.
  it('lets a collaborator start filing a report from the account menu', async () => {
    const wrapper = await mountHeader(true)
    const trigger = wrapper.get('button[aria-label^="Il tuo account: Maria Conte"]')
    await trigger.trigger('click')

    const file = wrapper.findAll('button').find((button) => button.text() === 'Segnala un problema')
    expect(file).toBeDefined()
    await file!.trigger('click')
    await flushPromises()

    expect(useMapStore().placing).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  // WCAG 2.5.3: someone using speech input says what they see on the button.
  it('names the account button with the initials it shows, and without them for a photo', async () => {
    const initials = await mountHeader(true)
    expect(initials.find('button[aria-label="Il tuo account: Maria Conte — MC"]').exists()).toBe(
      true,
    )

    const photo = await mountHeader(true, '/media/avatars/maria.jpg')
    expect(photo.find('button[aria-label="Il tuo account: Maria Conte"]').exists()).toBe(true)
  })

  it('closes the account menu on Escape and gives focus back to the avatar', async () => {
    const wrapper = await mountHeader(true)
    const trigger = wrapper.get('button[aria-label^="Il tuo account: Maria Conte"]')
    await trigger.trigger('click')

    await wrapper.get('a[href="/users"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
  })

  it('on a phone keeps the wordmark, Schede and Itinerari in the pill and the rest behind Menu', async () => {
    stubViewport(false)
    const wrapper = await mountHeader()

    // Itinerari is in the pill itself: a guest from a QR code is on a phone.
    // (Under 360px CSS hides it there and shows Menu's copy instead.)
    expect(wrapper.find('a[data-pill-itinerari]').exists()).toBe(true)
    expect(wrapper.find('a[href="/il-progetto"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="Menu"]').trigger('click')

    expect(wrapper.find('a[href="/il-progetto"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Segnala un problema')
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
