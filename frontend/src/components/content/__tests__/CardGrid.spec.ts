import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import CardGrid from '../CardGrid.vue'
import CoverPlaceholder from '../CoverPlaceholder.vue'

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: stub },
      { path: '/chiese/:id', name: 'chiesedetail', component: stub },
    ],
  })

const ENTRIES = [
  {
    id: 'a',
    title: 'Chiesa di San Francesco',
    summary: 'Gotica',
    cover: 'https://example.test/cover.jpg',
    isPublished: true,
    to: { name: 'chiesedetail', params: { id: 'a' } },
  },
  {
    id: 'b',
    title: 'Bozza senza foto',
    summary: 'Gaeta Medievale',
    cover: null,
    isPublished: false,
    to: { name: 'chiesedetail', params: { id: 'b' } },
  },
]

const mountGrid = () =>
  mount(CardGrid, {
    props: { entries: ENTRIES, type: 'chiese' },
    global: { plugins: [makeRouter()] },
  })

describe('CardGrid (spec/design.md D5/D6)', () => {
  it('links every entry to its card', () => {
    const wrapper = mountGrid()

    expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/chiese/a',
      '/chiese/b',
    ])
  })

  it('shows a cover where there is one and the type’s placeholder where there is not', () => {
    const wrapper = mountGrid()
    const [withCover, without] = wrapper.findAll('a')

    // One real image, one placeholder — a bare title is what covers exist to
    // avoid, so the fallback is a block rather than nothing.
    expect(withCover!.find('img').attributes('src')).toBe('https://example.test/cover.jpg')
    expect(withCover!.findComponent(CoverPlaceholder).exists()).toBe(false)
    expect(without!.find('img').exists()).toBe(false)
    expect(without!.getComponent(CoverPlaceholder).props('type')).toBe('chiese')
  })

  it('without a cover: a row on a phone, a 96px band above the title wider up (review PR-6)', () => {
    const wrapper = mountGrid()
    const [withCover, without] = wrapper.findAll('a')

    const band = without!.getComponent(CoverPlaceholder).classes()
    expect(band).toEqual(expect.arrayContaining(['size-12', 'sm:min-h-24', 'sm:w-full']))
    expect(without!.classes()).toEqual(expect.arrayContaining(['items-center', 'sm:flex-col']))
    // The cover card is a card at every width, its image capped on a phone.
    expect(withCover!.classes()).toContain('flex-col')
    expect(withCover!.get('img').classes()).toContain('max-sm:h-40')
  })

  it('holds every title to two lines, wrapped pretty, under the line that places it', () => {
    const wrapper = mountGrid()
    const without = wrapper.findAll('a')[1]!
    const [title, line] = without.findAll('span.line-clamp-2')

    expect(title!.classes()).toEqual(expect.arrayContaining(['text-pretty', 'sm:min-h-[2lh]']))
    expect(title!.text()).toContain('Bozza senza foto')
    expect(line!.text()).toBe('Gaeta Medievale')
  })

  it('never lets a column go under 260px (review A-06)', () => {
    const wrapper = mountGrid()

    expect(wrapper.get('ul').classes()).toContain(
      'sm:grid-cols-[repeat(auto-fill,minmax(16.25rem,1fr))]',
    )
  })

  it('marks a draft as one', () => {
    const wrapper = mountGrid()

    expect(wrapper.text()).toContain('bozza')
  })
})
