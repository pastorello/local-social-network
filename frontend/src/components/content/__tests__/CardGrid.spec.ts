import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import CardGrid from '../CardGrid.vue'

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
    cover: null,
    isPublished: false,
    to: { name: 'chiesedetail', params: { id: 'b' } },
  },
]

const mountGrid = () =>
  mount(CardGrid, {
    props: { entries: ENTRIES, placeholder: '#1d4ed8' },
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

  it('shows a cover where there is one and a tint where there is not', () => {
    const wrapper = mountGrid()

    // One real image, one placeholder — a bare title is what covers exist to
    // avoid, so the fallback is a block rather than nothing.
    const images = wrapper.findAll('img')
    expect(images).toHaveLength(1)
    expect(images[0]!.attributes('src')).toBe('https://example.test/cover.jpg')
    // A tint of the layer colour, not the saturated colour itself (D7).
    expect(wrapper.html()).toContain('color-mix')
  })

  it('marks a draft as one', () => {
    const wrapper = mountGrid()

    expect(wrapper.text()).toContain('bozza')
  })
})
