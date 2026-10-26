import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createMemoryHistory, createRouter } from 'vue-router'

import SchedeMenu from '../SchedeMenu.vue'
import lists from '@/lib/i18n/messages/lists'
import { chiesaConfig, luogoConfig } from '@/definitions/typeConfigs'

vi.mock('axios')

const COUNTS = {
  luoghi: 9,
  attivita: 4,
  chiese: 5,
  feste: 1,
  ricette: 2,
  personaggi: 0,
  dialetto: 0,
  libri: 3,
  itinerari: 2,
}

const mountAt = async (path = '/', section: 'esplora' | 'tradizioni' = 'esplora') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      // Named as the app names it: the menu knows its section by the route's
      // name (lib/navigation.ts::sectionOf).
      {
        path: '/chiese/:id',
        name: chiesaConfig.routeNames.detail,
        component: { template: '<div />' },
      },
      { path: '/feste/:id', name: 'festedetail', component: { template: '<div />' } },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  })
  router.push(path)
  await router.isReady()
  return mount(SchedeMenu, {
    props: { section },
    global: { plugins: [router] },
    attachTo: document.body,
  })
}

const openMenu = async (path = '/', section: 'esplora' | 'tradizioni' = 'esplora') => {
  const wrapper = await mountAt(path, section)
  await wrapper.get('button').trigger('click')
  await flushPromises()
  return wrapper
}

const entries = (wrapper: Awaited<ReturnType<typeof mountAt>>) =>
  wrapper.findAll('[role="menuitem"]')

// Two menus since 2026-10-26 (the author's decision): *Esplora* — the places,
// the tours, the businesses — and *Tradizioni* — the feasts, the dishes, the
// people, the dialect, the books.
describe('the Esplora and Tradizioni menus (review PR-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: COUNTS })
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lists the types in the order a reader looks for them, each in its menu', async () => {
    const explore = await openMenu()
    expect(entries(explore).map((entry) => entry.attributes('href'))).toEqual([
      '/luoghi',
      '/itinerari',
      '/attivita',
    ])
    explore.unmount()

    const traditions = await openMenu('/', 'tradizioni')
    expect(traditions.get('button').text()).toBe('Tradizioni')
    expect(entries(traditions).map((entry) => entry.attributes('href'))).toEqual([
      '/feste',
      '/ricette',
      '/personaggi',
      '/dialetto',
      '/libri',
    ])
  })

  it('carries a published count beside every entry, read when it opens', async () => {
    const wrapper = await mountAt()
    expect(axios.get).not.toHaveBeenCalled()

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(axios.get).toHaveBeenCalledWith('/api/content/counts/')
    expect(entries(wrapper).map((entry) => entry.text())).toEqual([
      'Luoghi, 9 schede',
      'Itinerari, 2 schede',
      'Attività, 4 schede',
    ])
    wrapper.unmount()

    const traditions = await openMenu('/', 'tradizioni')
    expect(entries(traditions).map((entry) => entry.text())).toEqual([
      'Feste, 1 scheda',
      'Ricette, 2 schede',
      'Personaggi storici, 0 schede',
      'Dialetto, 0 schede',
      'Libri consigliati, 3 schede',
    ])
  })

  it('greys an empty heading but keeps it a link', async () => {
    const wrapper = await openMenu('/', 'tradizioni')

    const dialetto = wrapper.get('a[href="/dialetto"]')
    expect(dialetto.classes()).toContain('text-muted')
    expect(dialetto.attributes('role')).toBe('menuitem')
    expect(wrapper.get('a[href="/feste"]').classes()).toContain('text-ink')
  })

  it('is still the menu when the counts cannot be read: no number, nothing greyed', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const wrapper = await openMenu('/', 'tradizioni')

    expect(entries(wrapper)).toHaveLength(5)
    expect(wrapper.get('a[href="/dialetto"]').text()).toBe('Dialetto')
    expect(wrapper.findAll('.text-muted')).toHaveLength(0)
  })

  it('asks again at every opening, so a card published meanwhile is counted', async () => {
    const wrapper = await openMenu()
    await wrapper.get('button').trigger('click')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(axios.get).toHaveBeenCalledTimes(2)
  })
})

describe('the Esplora menu and the churches (content.md, luoghi — review PR-9)', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: COUNTS })
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('names *Chiese* in one place only: the chip on /luoghi, not the menu', async () => {
    const wrapper = await openMenu()

    const labels = entries(wrapper).map((entry) => entry.text())
    expect(labels.some((label) => label.startsWith('Chiese'))).toBe(false)
    const related = luogoConfig.listFilter?.related ?? []
    expect(related.map((chip) => [chip.label(lists.it), chip.to])).toEqual([['Chiese', '/chiese']])
  })

  it('still lights up on a church, which is one of its cards', async () => {
    const wrapper = await mountAt('/chiese/c1')

    expect(wrapper.get('button').classes()).toContain('text-sea')
  })
})

// Review PR-23 (N-05, N-02): «Schede» was the name of our model; the button
// says what is behind it, and is the current item while a card is open.
describe('the Esplora menu’s name and state (review PR-23)', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: COUNTS })
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('is called Esplora', async () => {
    const wrapper = await mountAt()

    expect(wrapper.get('button').text()).toBe('Esplora')
  })

  it('is the current item on a card, underlined as well as tinted, and nowhere else', async () => {
    const card = await mountAt('/chiese/c1')
    expect(card.get('button').attributes('aria-current')).toBe('page')
    expect(card.get('button span').classes()).toContain('underline')

    const elsewhere = await mountAt('/il-progetto')
    expect(elsewhere.get('button').attributes('aria-current')).toBeUndefined()
    expect(elsewhere.get('button span').classes()).not.toContain('underline')
  })
})

describe('the Tradizioni menu’s state (2026-10-26)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('is the current item on a feast, and Esplora is not', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: COUNTS })
    const traditions = await mountAt('/feste/f1', 'tradizioni')
    expect(traditions.get('button').attributes('aria-current')).toBe('page')
    traditions.unmount()

    const explore = await mountAt('/feste/f1')
    expect(explore.get('button').attributes('aria-current')).toBeUndefined()
  })
})
