import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createMemoryHistory, createRouter } from 'vue-router'

import SchedeMenu from '../SchedeMenu.vue'
import { luogoConfig } from '@/definitions/typeConfigs'

vi.mock('axios')

const COUNTS = {
  luoghi: 9,
  chiese: 5,
  feste: 1,
  ricette: 2,
  personaggi: 0,
  dialetto: 0,
  libri: 3,
  itinerari: 2,
}

const mountAt = async (path = '/') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  router.push(path)
  await router.isReady()
  return mount(SchedeMenu, { global: { plugins: [router] }, attachTo: document.body })
}

const openMenu = async (path = '/') => {
  const wrapper = await mountAt(path)
  await wrapper.get('button').trigger('click')
  await flushPromises()
  return wrapper
}

const entries = (wrapper: Awaited<ReturnType<typeof mountAt>>) =>
  wrapper.findAll('[role="menuitem"]')

describe('the Schede menu (review PR-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: COUNTS })
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lists the types in the order a reader looks for them', async () => {
    const wrapper = await openMenu()

    expect(entries(wrapper).map((entry) => entry.attributes('href'))).toEqual([
      '/luoghi',
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
    const names = entries(wrapper).map((entry) => entry.text())
    expect(names).toEqual([
      'Luoghi, 9 schede',
      'Feste, 1 scheda',
      'Ricette, 2 schede',
      'Personaggi storici, 0 schede',
      'Dialetto, 0 schede',
      'Libri consigliati, 3 schede',
    ])
  })

  it('greys an empty heading but keeps it a link', async () => {
    const wrapper = await openMenu()

    const dialetto = wrapper.get('a[href="/dialetto"]')
    expect(dialetto.classes()).toContain('text-muted')
    expect(dialetto.attributes('role')).toBe('menuitem')
    expect(wrapper.get('a[href="/luoghi"]').classes()).toContain('text-ink')
  })

  it('is still the menu when the counts cannot be read: no number, nothing greyed', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const wrapper = await openMenu()

    expect(entries(wrapper)).toHaveLength(6)
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

describe('the Schede menu and the churches (content.md, luoghi — review PR-9)', () => {
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
    expect(luogoConfig.listFilter?.related).toEqual([{ label: 'Chiese', to: '/chiese' }])
  })

  it('still lights up on a church, which is one of its cards', async () => {
    const wrapper = await mountAt('/chiese/c1')

    expect(wrapper.get('button').classes()).toContain('text-sea')
  })
})
