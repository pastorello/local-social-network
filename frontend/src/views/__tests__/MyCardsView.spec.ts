import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import axios from 'axios'

import MyCardsView from '../MyCardsView.vue'
import type { MyCard } from '@/definitions/interfaces/Content'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

const stub = { template: '<div />' }

const CREATE = [
  'luoghicreate',
  'chiesecreate',
  'festecreate',
  'ricettecreate',
  'personaggicreate',
  'dialettocreate',
  'libricreate',
  'itinerariocreate',
]

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/le-mie-schede', component: stub },
      ...CREATE.map((name) => ({ path: `/nuova/${name}`, name, component: stub })),
      { path: '/:type/:id', component: stub },
    ],
  })

// As the API sends one: an original's `original_title` is its own title.
const card = (overrides: Partial<MyCard>): MyCard => {
  const title = overrides.title ?? 'Santissima Annunziata'
  return {
    id: 'c1',
    type: 'chiese',
    title,
    original_title: title,
    is_published: true,
    language: 'it',
    translation_of: null,
    updated_at: '2026-10-23T10:00:00Z',
    ...overrides,
  }
}

const mountWith = async (results: MyCard[], next: string | null = null) => {
  vi.mocked(axios.get).mockResolvedValueOnce({ data: { count: results.length, next, results } })
  const router = makeRouter()
  await router.push('/le-mie-schede')
  const wrapper = mount(MyCardsView, {
    global: { plugins: [createPinia(), router] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

// Review PR-13 (C-02; design.md "Left to the build"): a collaborator's own
// cards, every type at once, behind the avatar.
describe('MyCardsView — Le mie schede', () => {
  beforeEach(() => vi.mocked(axios.get).mockReset())
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('asks for the signed-in collaborator’s cards, a whole page at once', async () => {
    await mountWith([])

    expect(axios.get).toHaveBeenCalledWith('/api/content/mine/?page_size=100')
  })

  it('groups them by type, in the order the menu offers the types, the tours last', async () => {
    const wrapper = await mountWith([
      card({ id: 'i1', type: 'itinerari', title: 'Il giro del borgo' }),
      card({ id: 'c1', type: 'chiese' }),
      card({ id: 'l1', type: 'luoghi', title: 'Serapo' }),
    ])

    expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual([
      'Luoghi',
      'Chiese',
      'Itinerari',
    ])
  })

  // What a collaborator lands here for is at the top, whatever its type: a
  // draft church is not under the published places.
  it('puts the drafts first, then what is published, each by type', async () => {
    const wrapper = await mountWith([
      card({ id: 'd1', type: 'chiese', title: 'Bozza da finire', is_published: false }),
      card({ id: 'p1', type: 'luoghi', title: 'Già pubblicata' }),
    ])

    const parts = wrapper.findAll('section')
    expect(parts.map((part) => part.get('h2').text())).toEqual(['Bozze', 'Pubblicate'])
    expect(parts[0]!.text()).toContain('Bozza da finire')
    expect(parts[1]!.text()).toContain('Già pubblicata')
    expect(wrapper.text()).toContain('2 schede, 1 in bozza')
  })

  // Two clicks from the avatar to a draft's form: the menu's entry, then this.
  it('links each card to its page, and to its page with the form open', async () => {
    const wrapper = await mountWith([card({ id: 'd1', type: 'luoghi', is_published: false })])

    const hrefs = wrapper.findAll('li a').map((link) => link.attributes('href'))
    expect(hrefs).toEqual(['/luoghi/d1', '/luoghi/d1?edit=1'])
    // Label in name (WCAG 2.5.3): the visible «Modifica» leads the name.
    expect(wrapper.findAll('li a')[1]!.attributes('aria-label')).toBe(
      'Modifica Santissima Annunziata',
    )
  })

  it('files a translation under its Italian name, with its language beside it (T7)', async () => {
    const wrapper = await mountWith([
      card({
        id: 't1',
        title: '',
        original_title: 'Santissima Annunziata',
        language: 'en',
        translation_of: 'c1',
        is_published: false,
      }),
    ])

    const row = wrapper.get('li')
    expect(row.get('a').text()).toBe('Santissima Annunziata')
    expect(row.text()).toContain('Inglese')
  })

  it('offers a new card of every type, each to its own form', async () => {
    const wrapper = await mountWith([])
    await wrapper.get('button[aria-label="Nuova scheda"]').trigger('click')

    const links = wrapper.findAll('header a')
    expect(links.map((link) => link.text())).toEqual([
      'Luogo',
      'Chiesa',
      'Festa',
      'Ricetta',
      'Personaggio',
      'Termine',
      'Libro',
      'Itinerario',
    ])
    expect(links.map((link) => link.attributes('href'))).toEqual(
      CREATE.map((name) => `/nuova/${name}`),
    )
  })

  // The page is a panel, which closes on Escape (RoutePanel.vue): an Escape
  // that closes the menu is spent there.
  it('closes the menu of new cards on Escape, and only the menu', async () => {
    const wrapper = await mountWith([])
    const trigger = wrapper.get('button[aria-label="Nuova scheda"]')
    await trigger.trigger('click')

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    wrapper.get('header a').element.dispatchEvent(escape)
    await flushPromises()

    expect(escape.defaultPrevented).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
  })

  it('says so when there is nothing yet, rather than showing an empty page', async () => {
    const wrapper = await mountWith([])

    expect(wrapper.text()).toContain('Non hai ancora scritto nessuna scheda')
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('offers the rest when there are more than a page', async () => {
    const wrapper = await mountWith([card({})], '/api/content/mine/?page=2&page_size=100')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { count: 2, next: null, results: [card({ id: 'c2', title: 'San Francesco' })] },
    })

    await wrapper.get('button:not([aria-label])').trigger('click')
    await flushPromises()

    expect(axios.get).toHaveBeenLastCalledWith('/api/content/mine/?page=2&page_size=100')
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Carica altre')
  })
})
