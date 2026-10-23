import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, ref, type ComputedRef } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { cardPanelShape, useOpenPanelShape, usePanelShape } from '../usePanelShape'
import { useMapStore, type PanelShape } from '@/stores/map'

// Review PR-10 (P-09): the card decides its panel, not its type.
describe('cardPanelShape — the rule (design.md D17)', () => {
  it('opens a card with a place narrow, beside the map that shows it', () => {
    expect(cardPanelShape(true, false)).toBe('narrow')
  })

  it('opens a card without one wide, over a veiled map, like a book', () => {
    expect(cardPanelShape(false, false)).toBe('wide')
  })

  // Review PR-13: a form is written in the editor's shape, place or not — on
  // the right beside the map it draws on (D19), as wide as the reading panel.
  it('opens a card’s form in the editor, with or without a place', () => {
    expect(cardPanelShape(false, true)).toBe('editor')
    expect(cardPanelShape(true, true)).toBe('editor')
  })
})

describe('usePanelShape — the page tells the shell', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const mountAt = async (path: string, page: () => ReturnType<typeof h> | null) => {
    const stub = { render: () => null }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/ricette', component: stub },
        { path: '/ricette/:id', component: stub, meta: { panel: 'narrow' } },
      ],
    })
    await router.push(path)
    let shape: ComputedRef<PanelShape> | null = null
    const Shell = defineComponent({
      setup() {
        shape = useOpenPanelShape()
        return page
      },
    })
    const wrapper = mount(Shell, { global: { plugins: [router] } })
    return { wrapper, shape: () => shape!.value }
  }

  const pageSaying = (said: () => PanelShape | null) =>
    defineComponent({
      setup() {
        usePanelShape(said)
        return () => null
      },
    })

  it('draws a page in its route’s shape until the page says otherwise', async () => {
    const said = ref<PanelShape | null>(null)
    const Page = pageSaying(() => said.value)
    const { shape } = await mountAt('/ricette/r1', () => h(Page))
    expect(shape()).toBe('narrow')

    said.value = 'wide'
    await nextTick()
    expect(shape()).toBe('wide')
  })

  it('gives the route its shape back when the page is gone', async () => {
    const shown = ref(true)
    const Page = pageSaying(() => 'wide')
    const { shape } = await mountAt('/ricette/r1', () => (shown.value ? h(Page) : null))
    expect(shape()).toBe('wide')

    shown.value = false
    await nextTick()
    expect(shape()).toBe('narrow')
    expect(useMapStore().panelShape).toBeNull()
  })

  it('leaves alone what the next page said when the one before it goes', async () => {
    const pages = ref(['first'])
    const First = pageSaying(() => 'narrow')
    const Second = pageSaying(() => 'wide')
    const { shape } = await mountAt('/ricette/r1', () =>
      h(
        'div',
        pages.value.map((key) => h(key === 'first' ? First : Second, { key })),
      ),
    )
    expect(shape()).toBe('narrow')

    // The next page speaks before the last one is gone.
    pages.value = ['first', 'second']
    await nextTick()
    pages.value = ['second']
    await nextTick()

    expect(shape()).toBe('wide')
  })

  it('has nothing to say on a page that does not speak', async () => {
    const { shape } = await mountAt('/ricette', () => null)

    expect(shape()).toBe('wide')
  })
})
