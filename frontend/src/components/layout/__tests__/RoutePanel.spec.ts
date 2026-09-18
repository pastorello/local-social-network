import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import RoutePanel from '../RoutePanel.vue'

const stub = { template: '<div />' }

const mountPanel = async (shape: 'narrow' | 'wide' = 'wide') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/chiese', name: 'chieselist', component: stub },
    ],
  })
  router.push('/chiese')
  await router.isReady()
  const wrapper = mount(RoutePanel, {
    props: { shape },
    slots: { default: '<h1>Chiese</h1><input id="campo" />' },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, router }
}

describe('RoutePanel (spec/design.md D15/D17)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    window.history.replaceState(null, '')
  })

  it('takes the reader’s focus when it opens, so the next Tab is inside it', async () => {
    const { wrapper } = await mountPanel()

    expect(document.activeElement).toBe(wrapper.get('section').element)
  })

  it('closes onto the home when there is nowhere in the app to go back to — a deep link', async () => {
    const { wrapper, router } = await mountPanel()

    await wrapper.get('button[aria-label="Chiudi e torna alla mappa"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('goes back to where the reader came from when there is somewhere', async () => {
    const { wrapper, router } = await mountPanel()
    window.history.replaceState({ back: '/' }, '')
    const back = vi.spyOn(router, 'back').mockImplementation(() => {})

    await wrapper.get('button[aria-label="Chiudi e torna alla mappa"]').trigger('click')

    expect(back).toHaveBeenCalled()
  })

  it('closes on Escape, but leaves Escape to a field the reader is typing in', async () => {
    const { wrapper, router } = await mountPanel()

    await wrapper.get('#campo').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chiese')

    await wrapper.get('section').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('veils the map behind a wide panel, and not beside a narrow one', async () => {
    const wide = await mountPanel('wide')
    expect(wide.wrapper.find('div[aria-hidden="true"]').exists()).toBe(true)
    wide.wrapper.unmount()

    const narrow = await mountPanel('narrow')
    expect(narrow.wrapper.find('div[aria-hidden="true"]').exists()).toBe(false)
  })
})
