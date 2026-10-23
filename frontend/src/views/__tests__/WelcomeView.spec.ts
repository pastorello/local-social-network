import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createMemoryHistory, createRouter } from 'vue-router'

import WelcomeView from '../WelcomeView.vue'
import { PRESENTATION } from '@/definitions/copy'

vi.mock('axios')

// One answer per endpoint: the intents, and the zones with their counts.
const answer = (intents: unknown[], zones: unknown[] = []) =>
  vi.mocked(axios.get).mockImplementation(async (url: string) => ({
    data: url === '/api/map/zone/' ? zones : intents,
  }))

const mountWelcome = async () => {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: stub },
      { path: '/benvenuto', component: stub },
      { path: '/itinerari', name: 'itinerarilist', component: stub },
      { path: '/cosa-fare', name: 'cosafare', component: stub },
    ],
  })
  router.push('/benvenuto')
  await router.isReady()
  const wrapper = mount(WelcomeView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('WelcomeView — the address on a B&B’s card (spec itinerari.md I6)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks one question and offers only the intents that lead to a tour', async () => {
    answer([
      { slug: 'mare', name: 'Andare al mare', description: 'Le spiagge', count: 1 },
      { slug: 'mangiare', name: 'Mangiare bene', count: 0 },
      { slug: 'citta', name: 'Scoprire la città', count: 2 },
    ])
    const wrapper = await mountWelcome()

    expect(wrapper.get('h1').text()).toBe('Che cosa ti va di fare?')
    const hrefs = wrapper.findAll('li a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['/itinerari?intento=mare', '/itinerari?intento=citta'])
    expect(wrapper.text()).toContain('2 itinerari')
    expect(wrapper.text()).toContain('Le spiagge')
  })

  // Review PR-14 (P-07): a guest from the QR code is told what the site is, in
  // the home's own words (definitions/copy.ts), under the question.
  it('says what the site is under the question, as the home does', async () => {
    answer([])
    const wrapper = await mountWelcome()

    const lines = wrapper.findAll('p').map((p) => p.text())
    expect(lines.indexOf(PRESENTATION)).toBeGreaterThan(-1)
    expect(wrapper.html().indexOf(PRESENTATION)).toBeGreaterThan(
      wrapper.html().indexOf('Che cosa ti va di fare?'),
    )
  })

  // Review PR-14 (M-09): each intent wears a tint of its own colour, a token
  // (D8), with its icon — the sea, the town, the walk, the table.
  it('gives each intent its tint and its icon, and an intent nobody drew the tours’ map', async () => {
    answer([
      { slug: 'mare', name: 'Andare al mare', count: 1 },
      { slug: 'citta', name: 'Scoprire la città', count: 1 },
      { slug: 'camminare', name: 'Camminare', count: 1 },
      { slug: 'mangiare', name: 'Mangiare', count: 1 },
      { slug: 'bere', name: 'Bere', count: 1 },
    ])
    const wrapper = await mountWelcome()

    const tiles = wrapper.findAll('li a > span[aria-hidden="true"]')
    expect(tiles.map((tile) => tile.attributes('style'))).toEqual([
      expect.stringContaining('var(--color-intent-mare)'),
      expect.stringContaining('var(--color-intent-citta)'),
      expect.stringContaining('var(--color-intent-camminare)'),
      expect.stringContaining('var(--color-intent-mangiare)'),
      expect.stringContaining('var(--color-layer-unknown)'),
    ])
    // A tint, never the colour as a ground (D7), and an icon in every tile.
    tiles.forEach((tile) => {
      expect(tile.attributes('style')).toContain('color-mix(in oklab')
      expect(tile.find('svg').exists()).toBe(true)
    })
    const paths = tiles.map((tile) => tile.get('svg path').attributes('d'))
    expect(new Set(paths).size).toBe(5)
  })

  // M-09: «la seconda ha un bordo scuro di focus residuo». The ring is the
  // keyboard's alone (focus-visible), and the pointer gets no darker border.
  it('rings a card for the keyboard only, and darkens no border under the pointer', async () => {
    answer(
      [{ slug: 'mare', name: 'Andare al mare', count: 1 }],
      [{ slug: 's', name: 'S', count: 1 }],
    )
    const wrapper = await mountWelcome()

    const cards = [wrapper.get('li a'), wrapper.get('a[href="/cosa-fare"]')]
    cards.forEach((card) => {
      const classes = card.classes()
      expect(classes).toContain('focus-visible:outline-2')
      expect(classes.filter((name) => name.startsWith('focus:'))).toEqual([])
      expect(classes.filter((name) => name.startsWith('hover:border'))).toEqual([])
    })
  })

  // Review PR-14: the way out is a closing link, not a button, and it says
  // «vai alla mappa» — the menu's «Esplora» is on the same screen (PR-23).
  it('closes on a text link to the map, «Oppure vai alla mappa»', async () => {
    answer([])
    const wrapper = await mountWelcome()

    const out = wrapper.get('a[href="/"]')
    expect(out.text()).toBe('Oppure vai alla mappa')
    expect(out.classes()).toContain('underline')
    expect(out.classes()).not.toContain('rounded-full')
    expect(wrapper.text()).not.toContain('esplora la mappa')
  })

  it('says the tours are coming rather than showing an empty list', async () => {
    answer([])
    const wrapper = await mountWelcome()

    expect(wrapper.text()).toContain('Gli itinerari sono in preparazione')
  })

  // spec cosa-fare.md Part −1, D8: no door onto an empty room.
  it('offers «Cosa si può fare qui» only once a zone has a published place', async () => {
    answer([], [{ slug: 'serapo', name: 'Serapo', count: 0 }])
    const empty = await mountWelcome()
    expect(empty.find('a[href="/cosa-fare"]').exists()).toBe(false)

    answer([], [{ slug: 'serapo', name: 'Serapo', count: 2 }])
    const open = await mountWelcome()
    expect(open.get('a[href="/cosa-fare"]').text()).toContain("Oppure guarda cosa c'è in una zona")
  })
})
