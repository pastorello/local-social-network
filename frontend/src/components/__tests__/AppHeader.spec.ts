import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppHeader from '../AppHeader.vue'
import App from '@/App.vue'
import { chiesaConfig, itinerarioConfig, luogoConfig } from '@/definitions/typeConfigs'
import { useMapStore } from '@/stores/map'
import { useUserStore } from '@/stores/user'

const page = { template: '<div />' }

// Named as the app names them: the menu finds the reader's section by the
// route's name (lib/navigation.ts::sectionOf).
const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      // The welcome page is the home since 2026-10-26, /benvenuto leads to
      // it, and the map is /mappa.
      { path: '/', name: 'home', component: page },
      { path: '/mappa', name: 'mappa', component: page, meta: { fullBleed: true } },
      { path: '/profile/:id', name: 'profile', component: page },
      { path: '/benvenuto', name: 'benvenuto', redirect: { name: 'home' } },
      { path: '/login', name: 'login', component: page },
      { path: '/luoghi', name: luogoConfig.routeNames.list, component: page },
      { path: '/chiese/:id', name: chiesaConfig.routeNames.detail, component: page },
      { path: '/itinerari', name: itinerarioConfig.routeNames.list, component: page },
      { path: '/itinerari/:id', name: itinerarioConfig.routeNames.detail, component: page },
      { path: '/cosa-fare', name: 'cosafare', component: page },
      { path: '/il-progetto', name: 'progetto', component: page },
      { path: '/:pathMatch(.*)*', component: { template: '<div>pagina</div>' } },
    ],
  })

const mountHeader = async (signedIn = false, avatarURL: string | null = null, path = '/') => {
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
  router.push(path)
  await router.isReady()
  return mount(AppHeader, { global: { plugins: [pinia, router] }, attachTo: document.body })
}

const currentItems = (wrapper: Awaited<ReturnType<typeof mountHeader>>) =>
  wrapper.findAll('[aria-current="page"]').map((element) => element.text())

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

  it('is Mappa, Esplora, Itinerari, Il progetto and Accedi — not the polls, nor a search', async () => {
    const wrapper = await mountHeader()
    const nav = wrapper.get('nav[aria-label="Principale"]')

    expect(nav.text()).toContain('Mappa')
    // «Schede» until 2026-10-23: the name of our model, not a guest's word
    // (review PR-23, N-05).
    expect(nav.get('button[aria-haspopup="menu"]').text()).toBe('Esplora')
    expect(nav.text()).not.toContain('Schede')
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

  // Review PR-13 (C-02): what a collaborator signs in for comes first behind
  // the avatar — their own cards, every type at once — then the polls, which
  // are for someone with an account since review PR-17 (reports-and-polls.md
  // P1), then the profile. On a phone, in the same order inside Menu.
  it.each([
    ['the avatar', true, 'button[aria-label^="Il tuo account"]'],
    ['Menu, on a phone', false, 'button[aria-label="Menu"]'],
  ])('puts a collaborator’s own cards first behind %s', async (_, desktop, button) => {
    stubViewport(desktop)
    const wrapper = await mountHeader(true)
    const trigger = wrapper.get(button)
    await trigger.trigger('click')

    const entries = wrapper.get(`#${trigger.attributes('aria-controls')}`).findAll('a, button')
    const names = entries.map((entry) => entry.text())
    const mine = names.indexOf('Le mie schede')
    expect(mine).toBeGreaterThanOrEqual(0)
    expect(names.slice(mine, mine + 3)).toEqual(['Le mie schede', 'Sondaggi', 'Il tuo profilo'])
    expect(entries[mine]!.attributes('href')).toBe('/le-mie-schede')
    expect(entries[mine + 1]!.attributes('href')).toBe('/polls')
  })

  // The polls are behind the login (review PR-17): a reader's Menu does not
  // offer a page that would only send them to sign in.
  it('does not offer the polls to a reader on a phone', async () => {
    stubViewport(false)
    const wrapper = await mountHeader()
    await wrapper.get('button[aria-label="Menu"]').trigger('click')

    expect(wrapper.find('a[href="/polls"]').exists()).toBe(false)
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

  it('on a phone keeps the wordmark, Esplora and Itinerari in the pill and the rest behind Menu', async () => {
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

// Review PR-23 (N-02): the item above the page the reader is on is current —
// to a screen reader, and to the eye by an underline as well as the tint
// (WCAG 1.4.1). The sign-in page is what its own link leads to. The home and
// the welcome page mark nothing, not even the wordmark or *Mappa* on the home
// they lead to (decided by the author on 2026-10-23, review PR-25).
describe('the menu’s current item (review PR-23)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    // @ts-expect-error — putting jsdom back the way it was found
    delete window.matchMedia
  })

  it.each([
    ['/', []],
    ['/benvenuto', []],
    ['/mappa', ['Mappa']],
    ['/luoghi', ['Esplora']],
    ['/chiese/c1', ['Esplora']],
    ['/itinerari', ['Itinerari']],
    ['/itinerari/t1?tappa=2', ['Itinerari']],
    ['/cosa-fare?zona=serapo', ['Cosa fare']],
    ['/il-progetto', ['Il progetto']],
    ['/login', ['Accedi']],
  ])('on %s it is %j', async (path, expected) => {
    const wrapper = await mountHeader(false, null, path)

    expect(currentItems(wrapper)).toEqual(expected)
  })

  it('is underlined, not told by its colour alone', async () => {
    const tour = await mountHeader(false, null, '/itinerari/t1')
    expect(tour.get('a[href="/itinerari"]').classes()).toEqual(
      expect.arrayContaining(['underline', 'text-sea']),
    )
    expect(tour.get('a[href="/cosa-fare"]').classes()).not.toContain('underline')

    const card = await mountHeader(false, null, '/chiese/c1')
    expect(card.get('button[aria-haspopup="menu"] span').classes()).toContain('underline')
  })

  it.each(['/', '/benvenuto'])(
    'marks nothing on %s inside the phone’s Menu either',
    async (path) => {
      stubViewport(false)
      const wrapper = await mountHeader(false, null, path)
      await wrapper.get('button[aria-label="Menu"]').trigger('click')

      expect(wrapper.get('a[href="/mappa"]').text()).toBe('Mappa')
      expect(currentItems(wrapper)).toEqual([])
      expect(wrapper.find('.underline').exists()).toBe(false)
    },
  )

  it('is marked inside the phone’s Menu too', async () => {
    stubViewport(false)
    const wrapper = await mountHeader(false, null, '/il-progetto')
    await wrapper.get('button[aria-label="Menu"]').trigger('click')

    const project = wrapper.get('a[href="/il-progetto"]')
    expect(project.attributes('aria-current')).toBe('page')
    expect(project.classes()).toContain('underline')
    expect(wrapper.get('a[href="/cosa-fare"]').attributes('aria-current')).toBeUndefined()
    expect(wrapper.get('a[href="/mappa"]').attributes('aria-current')).toBeUndefined()
  })

  it('on a phone lights Esplora and Itinerari in the pill itself', async () => {
    stubViewport(false)
    const card = await mountHeader(false, null, '/chiese/c1')
    expect(card.get('button[aria-haspopup="menu"]').attributes('aria-current')).toBe('page')

    const tour = await mountHeader(false, null, '/itinerari/t1')
    expect(tour.get('a[data-pill-itinerari]').attributes('aria-current')).toBe('page')
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
