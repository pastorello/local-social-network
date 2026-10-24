import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import axios from 'axios'

import ProjectView from '../ProjectView.vue'
import { PROJECT_STORY } from '@/definitions/copy'
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
    const partecipa = collaborator.get('section[aria-labelledby="progetto-partecipa"]')
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
    // Review PR-12: the licence is named and linked, in the credits' body size.
    const credits = wrapper.get('section[aria-label="Crediti"]')
    expect(credits.classes()).toContain('text-sm')
    expect(credits.get('a[href="https://opendatacommons.org/licenses/odbl/"]').text()).toBe('ODbL')
  })

  // Review PR-23 (N-05): «Schede» is the name of our model, and «Esplora» is
  // the menu's — over the card types — so neither heads a column here: one
  // screen never has two «Esplora» meaning two things.
  it('heads the card types «Cosa trovi su Vivere Gaeta», and says neither Schede nor Esplora', async () => {
    const wrapper = await mountProject()

    expect(wrapper.get('nav[aria-label="Cosa trovi su Vivere Gaeta"] h2').text()).toBe(
      'Cosa trovi su Vivere Gaeta',
    )
    expect(wrapper.text()).not.toMatch(/Schede|Esplora/)
  })

  // Review PR-12 (P-08, L-11): the page said what links there were and not who
  // makes the archive. It reads from the top now — the story, how it is used,
  // the rule, how to take part — and the index and the credits come last.
  it('reads from the top as a page: the story, then how it is used, the rule, taking part, the index', async () => {
    const wrapper = await mountProject()

    expect(wrapper.findAll('h1 + div > p').map((p) => p.text())).toEqual([...PROJECT_STORY])
    expect(wrapper.get('h1 + div').classes()).toContain('text-reading')
    expect(wrapper.findAll('h2').map((h2) => h2.text())).toEqual([
      'Come si usa',
      'La regola',
      'Partecipa',
      'Per cominciare',
      'Cosa trovi su Vivere Gaeta',
    ])
    // «Partecipa» is a section of the page now, not a third column of the
    // index under it: one «Partecipa», not two.
    expect(wrapper.findAll('nav').map((nav) => nav.attributes('aria-label'))).toEqual([
      'Per cominciare',
      'Cosa trovi su Vivere Gaeta',
    ])
  })

  it('says how it is used — the tours, the zones, the map — each with its link', async () => {
    const wrapper = await mountProject()
    const rows = wrapper.findAll('section[aria-labelledby="progetto-uso"] li')

    expect(rows.map((li) => li.get('a').attributes('href'))).toEqual([
      '/itinerari',
      '/cosa-fare',
      '/',
    ])
    expect(rows.map((li) => li.get('a').text())).toEqual([
      'Itinerari',
      'Cosa si può fare qui',
      'La mappa',
    ])
  })

  // The way to report a mistake is the collaboration request, whose message
  // is free text: the form has no field for why someone writes and none is
  // added for this, so the line says what to put in the message — and the link
  // carries no query the form would not read.
  it('asks a reader who found a mistake to write, through the collaboration request', async () => {
    const wrapper = await mountProject()
    const partecipa = wrapper.get('section[aria-labelledby="progetto-partecipa"]')
    const row = partecipa.findAll('li').find((li) => li.text().includes('Hai trovato un errore'))

    expect(row?.text()).toContain('Hai trovato un errore o una cosa che manca?')
    expect(row?.get('a').text()).toBe('Scrivici')
    expect(row?.get('a').attributes('href')).toBe('/collabora')
    expect(partecipa.get('a').text()).toBe('Collabora con noi')
  })

  // Review PR-18: the archive's line — under the title until review PR-12
  // wrote the page's story, and under the story since.
  it('says how many cards the archive has and when the latest changed, under the story', async () => {
    const wrapper = await mountProject()

    const line = wrapper.get('h1 + div + p')
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
    expect(wrapper.get('h1 + div + p').text()).toBe('')

    answer({ data: { published: 0, last_updated: null } })
    await flushPromises()

    expect(wrapper.find('h1 + div + p').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/0 schede|aggiornata/)
  })

  it('has the page’s one h1', async () => {
    const wrapper = await mountProject()

    expect(wrapper.findAll('h1').map((h) => h.text())).toEqual(['Il progetto'])
  })
})
