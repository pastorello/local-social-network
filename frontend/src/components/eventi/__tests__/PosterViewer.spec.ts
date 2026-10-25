import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import PosterViewer from '../PosterViewer.vue'

// The poster that zooms (cosa-fare.md Part −1 D9; ADR-0005): a tap opens it on
// the whole screen, Escape and «Chiudi» close it, focus goes back to what
// opened it, and the rest of the app is inert meanwhile.
describe('PosterViewer', () => {
  let app: HTMLElement

  beforeEach(() => {
    app = document.createElement('div')
    app.id = 'app'
    document.body.append(app)
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const mountViewer = () =>
    mount(PosterViewer, {
      props: { src: '/media/event_posters/locandina.jpg', title: 'Musica sul molo' },
      attachTo: app,
    })

  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')

  it('opens on the whole screen, named after the event, with focus on «Chiudi»', async () => {
    const wrapper = mountViewer()
    const trigger = wrapper.get('button[aria-label="Ingrandisci la locandina di Musica sul molo"]')

    await trigger.trigger('click')

    expect(dialog()?.getAttribute('aria-modal')).toBe('true')
    expect(dialog()?.getAttribute('aria-label')).toBe('La locandina di Musica sul molo')
    expect(document.activeElement?.textContent?.trim()).toBe('Chiudi')
    expect(app.hasAttribute('inert')).toBe(true)
    expect(dialog()?.querySelector('img')?.getAttribute('alt')).toBe(
      'La locandina di Musica sul molo',
    )
  })

  it('closes on Escape — spent there, not on the panel underneath — and gives focus back', async () => {
    const wrapper = mountViewer()
    const trigger = wrapper.get('button')
    ;(trigger.element as HTMLElement).focus()
    await trigger.trigger('click')

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.activeElement!.dispatchEvent(escape)
    await wrapper.vm.$nextTick()

    expect(escape.defaultPrevented).toBe(true)
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
    expect(app.hasAttribute('inert')).toBe(false)
  })

  it('closes with its button too', async () => {
    const wrapper = mountViewer()
    await wrapper.get('button').trigger('click')

    ;[...dialog()!.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Chiudi')!
      .click()
    await wrapper.vm.$nextTick()

    expect(dialog()).toBeNull()
  })

  it('keeps Tab inside its own controls', async () => {
    const wrapper = mountViewer()
    await wrapper.get('button').trigger('click')
    const [size, close] = [...dialog()!.querySelectorAll('button')]

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    close!.dispatchEvent(tab)

    expect(tab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(size)
  })

  it('shows the poster at its own size on request, said with aria-pressed', async () => {
    const wrapper = mountViewer()
    await wrapper.get('button').trigger('click')
    const size = dialog()!.querySelector('button')!

    size.click()
    await wrapper.vm.$nextTick()

    expect(size.getAttribute('aria-pressed')).toBe('true')
    expect(dialog()!.querySelector('img')!.className).toContain('max-w-none')
  })
})
