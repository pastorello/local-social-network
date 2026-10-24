import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import axios from 'axios'

import ProjectView from '../ProjectView.vue'
import { useUserStore } from '@/stores/user'

vi.mock('axios')

const answerStats = (data: unknown) =>
  vi
    .mocked(axios.get)
    .mockImplementation((url: string) =>
      url === '/api/content/stats/'
        ? Promise.resolve({ data })
        : Promise.reject(new Error(`unexpected ${url}`)),
    )

const mountProject = async (signedIn = false) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (signedIn) {
    const user = useUserStore().user
    user.isAuthenticated = true
    user.id = 'u1'
    user.name = 'Maria Conte'
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  router.push('/il-progetto')
  await router.isReady()
  const wrapper = mount(ProjectView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
}

// Il progetto is the credits surface (spec/design.md D21) — what the footer
// carried until the map went under every page. These are the footer's own
// tests, moved with it.
describe('Il progetto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    answerStats({ published: 15, last_updated: '2026-10-22' })
  })

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

  it('is where "Collabora con noi" is reached from (D14)', async () => {
    const wrapper = await mountProject()
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))

    expect(hrefs).toContain('/collabora')
    expect(hrefs).toContain('/itinerari')
  })

  // Review PR-17 (decided 2026-10-22, reports-and-polls.md P1): the polls are
  // an internal tool. A reader is not offered a link that would only send
  // them to sign in; someone with an account finds them under «Partecipa».
  it('offers the polls under «Partecipa» to someone signed in, and not to a reader', async () => {
    const reader = await mountProject()
    expect(reader.find('a[href="/polls"]').exists()).toBe(false)
    expect(reader.text()).not.toContain('Sondaggi')

    const collaborator = await mountProject(true)
    const partecipa = collaborator.get('nav[aria-label="Partecipa"]')
    expect(partecipa.get('a[href="/polls"]').text()).toBe('Sondaggi')
    expect(collaborator.findAll('a[href="/polls"]')).toHaveLength(1)
  })

  it('states the editorial rule (D10) rather than showing a sponsor slot (D12)', async () => {
    const wrapper = await mountProject()

    expect(wrapper.text()).toContain('nessuna presenza è acquistata')
    // No invented endorsement: there is no patrocinio today, and a placeholder
    // would be the product claiming something that is not true (D11).
    expect(wrapper.text()).not.toMatch(/patrocinio|sponsor/i)
  })

  it('credits OpenStreetMap for the map and the zones, with its copyright page (ODbL)', async () => {
    const wrapper = await mountProject()
    const osm = wrapper.findAll('a').find((a) => a.text() === 'OpenStreetMap')

    expect(osm?.attributes('href')).toBe('https://www.openstreetmap.org/copyright')
    expect(wrapper.text()).toContain('Mappa e zone')
    expect(wrapper.text()).toContain('ODbL')
  })

  // Review PR-23 (N-05): «Schede» is the name of our model, and «Esplora» is
  // the menu's — over the card types — so neither heads a column here: one
  // screen never has two «Esplora» meaning two things.
  it('heads the card types «Cosa trovi su Vivere Gaeta», and says neither Schede nor Esplora', async () => {
    const wrapper = await mountProject()

    expect(wrapper.findAll('h2').map((h2) => h2.text())).toEqual([
      'Per cominciare',
      'Cosa trovi su Vivere Gaeta',
      'Partecipa',
    ])
    expect(wrapper.text()).not.toMatch(/Schede|Esplora/)
  })

  // Review PR-18: the archive's line, under the title until review PR-12
  // writes the page's own presentation and moves it beneath that.
  it('says how many cards the archive has and when the latest changed', async () => {
    const wrapper = await mountProject()

    const line = wrapper.get('h1 + p')
    expect(line.text()).toBe('15 schede, l’ultima aggiornata il 22 ottobre 2026')
  })

  it('holds the line’s place while it is asked for, and gives it up for an empty archive', async () => {
    let answer: (value: { data: unknown }) => void = () => {}
    vi.mocked(axios.get).mockImplementation(
      () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    )
    const wrapper = await mountProject()

    // Held, so the words under it do not jump when it arrives.
    expect(wrapper.get('h1 + p').text()).toBe('')

    answer({ data: { published: 0, last_updated: null } })
    await flushPromises()

    expect(wrapper.get('h1 + p').text()).toContain('Vivere Gaeta')
    expect(wrapper.text()).not.toMatch(/0 schede|aggiornata/)
  })

  it('has the page’s one h1', async () => {
    const wrapper = await mountProject()

    expect(wrapper.findAll('h1').map((h) => h.text())).toEqual(['Il progetto'])
  })
})
