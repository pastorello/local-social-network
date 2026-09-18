import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import RoutePanel from '../RoutePanel.vue'

const stub = { template: '<div />' }

const mountPanel = async (shape: 'narrow' | 'wide' = 'wide', path = '/chiese') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/chiese', name: 'chieselist', component: stub },
    ],
  })
  router.push(path)
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

const stubPhone = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  })
}

describe('RoutePanel (spec/design.md D15/D17)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    window.history.replaceState(null, '')
    // @ts-expect-error — putting jsdom back the way it was found
    delete window.matchMedia
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

describe('RoutePanel on a phone (spec/design.md D18)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    window.history.replaceState(null, '')
    // @ts-expect-error — putting jsdom back the way it was found
    delete window.matchMedia
  })

  it('leaves a strip of the map above a card with a place, with a way to enlarge it', async () => {
    stubPhone()
    const { wrapper, router } = await mountPanel('narrow')

    expect(wrapper.get('section').classes()).toContain('top-[11.25rem]')
    await wrapper.get('button:not([aria-label])').trigger('click')
    await flushPromises()

    // The enlarged map is a step in the URL, so Back undoes it.
    expect(router.currentRoute.value.query.mappa).toBe('1')
    expect(wrapper.get('section').isVisible()).toBe(false)
    expect(wrapper.text()).toContain('Torna alla scheda')
    expect(document.activeElement?.textContent).toContain('Torna alla scheda')
  })

  it('comes back to the card from a shared link to the enlarged map', async () => {
    stubPhone()
    const { wrapper, router } = await mountPanel('narrow', '/chiese?mappa=1')

    await wrapper.get('button:not([aria-label])').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.mappa).toBeUndefined()
    expect(wrapper.get('section').isVisible()).toBe(true)
  })

  it('is the whole screen for a page without a place', async () => {
    stubPhone()
    const { wrapper } = await mountPanel('wide')

    expect(wrapper.get('section').classes()).toContain('inset-0')
    expect(wrapper.text()).not.toContain('Allarga la mappa')
  })
})
