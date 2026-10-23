import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import RoutePanel from '../RoutePanel.vue'
import { usePanelTrail, type Trail } from '@/composables/usePanelTrail'

const stub = { template: '<div />' }

type Slot = string | (() => ReturnType<typeof h>)

const mountPanel = async (
  shape: 'narrow' | 'wide' = 'wide',
  path = '/chiese',
  slot: Slot = '<h1>Chiese</h1><input id="campo" />',
) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/chiese', name: 'chieselist', component: stub },
      { path: '/chiese/:id', name: 'chiesedetail', component: stub },
      { path: '/cosa-fare', name: 'cosafare', component: stub },
      { path: '/itinerari', name: 'itinerarilist', component: stub },
      { path: '/itinerari/:id', name: 'itinerariodetail', component: stub },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(RoutePanel, {
    props: { shape },
    slots: { default: slot },
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

  it('closes onto the map from a deep link — not out of the site', async () => {
    const { wrapper, router } = await mountPanel()

    await wrapper.get('button[aria-label="Chiudi e torna alla mappa"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  // Review PR-22 (N-01): a close button closes. With pages behind it, it is
  // still one press to the map, never a step back through them.
  it('closes onto the map with pages behind it, by pushing the home — never by going back', async () => {
    const { wrapper, router } = await mountPanel()
    window.history.replaceState({ back: '/il-progetto' }, '')
    const push = vi.spyOn(router, 'push')
    const back = vi.spyOn(router, 'back')

    await wrapper.get('button[aria-label="Chiudi e torna alla mappa"]').trigger('click')

    expect(push).toHaveBeenCalledWith('/')
    expect(back).not.toHaveBeenCalled()
  })

  it('closes on a tap on the veil, as on the button', async () => {
    const { wrapper, router } = await mountPanel('wide')
    const back = vi.spyOn(router, 'back')

    await wrapper.get('div[aria-hidden="true"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
    expect(back).not.toHaveBeenCalled()
  })

  it('closes on Escape, but leaves Escape to a field the reader is typing in', async () => {
    const { wrapper, router } = await mountPanel()
    const back = vi.spyOn(router, 'back')

    await wrapper.get('#campo').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chiese')

    await wrapper.get('section').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
    expect(back).not.toHaveBeenCalled()
  })

  // Review PR-22 (N-03): up is a link one level above, beside the close
  // button, named after the page it leads to.
  it('offers a card the way up to its type’s list', async () => {
    const { wrapper, router } = await mountPanel('narrow', '/chiese/c1')

    const up = wrapper.get('a[href="/chiese"]')
    expect(up.text()).toBe('Chiese')
    await up.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/chiese')
    // A list has nothing above it but the map, which the close button is.
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('gives focus to the panel after going up, even when only the query changed', async () => {
    const { wrapper, router } = await mountPanel('narrow', '/cosa-fare?zona=serapo')

    const up = wrapper.get('a[href="/cosa-fare"]')
    ;(up.element as HTMLElement).focus()
    await up.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/cosa-fare')
    expect(document.activeElement).toBe(wrapper.get('section').element)
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

  // Review PR-22 (N-06): "Torna alla scheda" is the enlarged map's way up, and
  // like every button of the app it does not imitate Back — even when the
  // enlarged map was a step of this visit. Back stays the browser's.
  it('comes back to the card by a step forward, never by going back', async () => {
    stubPhone()
    const { wrapper, router } = await mountPanel('narrow', '/chiese/c1')
    await wrapper.get('button:not([aria-label])').trigger('click')
    await flushPromises()
    window.history.replaceState({ back: '/chiese/c1' }, '')
    const back = vi.spyOn(router, 'back')

    await wrapper.get('button:not([aria-label])').trigger('click')
    await flushPromises()

    expect(back).not.toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe('/chiese/c1')
    expect(wrapper.get('section').isVisible()).toBe(true)
  })

  it('is the whole screen for a page without a place', async () => {
    stubPhone()
    const { wrapper } = await mountPanel('wide')

    expect(wrapper.get('section').classes()).toContain('inset-0')
    expect(wrapper.text()).not.toContain('Allarga la mappa')
  })
})

// A page, as the panel holds one, handing over the rest of its eyebrow.
const pageWith = (trail: () => Trail | null) =>
  defineComponent({
    setup() {
      usePanelTrail(trail)
      return () => h('h1', 'Pagina')
    },
  })

// Review PR-23 (N-02): the up link is the eyebrow over the page — the level
// above, and what this page is within it — inside a nav that says what it is.
describe('RoutePanel’s eyebrow (review PR-23)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const eyebrow = (wrapper: Awaited<ReturnType<typeof mountPanel>>['wrapper']) =>
    wrapper.get('nav[aria-label="Dove sei"]')

  it('names a card’s type and its zone, each a link, in the type’s colour', async () => {
    const page = pageWith(() => ({
      steps: [
        { label: 'Gaeta Medievale', to: { name: 'cosafare', query: { zona: 'gaeta-medievale' } } },
      ],
    }))
    const { wrapper } = await mountPanel('narrow', '/chiese/c1', () => h(page))

    const links = eyebrow(wrapper).findAll('a')
    expect(links.map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Chiese', '/chiese'],
      ['Gaeta Medievale', '/cosa-fare?zona=gaeta-medievale'],
    ])
    expect(eyebrow(wrapper).attributes('style')).toContain('var(--color-layer-chiese)')
    // The colour is never the only sign of a link (WCAG 1.4.1).
    expect(links[1]!.classes()).toContain('underline')
  })

  it('takes a stop up by its tour’s name, and says which stop it is', async () => {
    const page = pageWith(() => ({ up: 'Giro del centro', steps: [{ label: 'Tappa 3 di 7' }] }))
    const { wrapper } = await mountPanel('narrow', '/itinerari/t1?tappa=3', () => h(page))

    const nav = eyebrow(wrapper)
    expect(nav.findAll('a').map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Giro del centro', '/itinerari/t1'],
    ])
    expect(nav.text()).toContain('Tappa 3 di 7')
    expect(nav.attributes('style')).toContain('var(--color-terracotta)')
  })

  it('has no eyebrow on a page with nothing above it but the map', async () => {
    const { wrapper } = await mountPanel('wide', '/chiese')

    expect(wrapper.find('nav[aria-label="Dove sei"]').exists()).toBe(false)
  })

  it('forgets a page’s part of it once the page is gone', async () => {
    const shown = ref(true)
    const page = pageWith(() => ({ steps: [{ label: 'Serapo' }] }))
    const { wrapper } = await mountPanel('narrow', '/cosa-fare?zona=serapo', () =>
      shown.value ? h(page) : h('h1', 'Altro'),
    )
    expect(eyebrow(wrapper).text()).toContain('Serapo')

    shown.value = false
    await flushPromises()

    expect(eyebrow(wrapper).text()).toContain('Cosa fare')
    expect(eyebrow(wrapper).text()).not.toContain('Serapo')
  })
})
