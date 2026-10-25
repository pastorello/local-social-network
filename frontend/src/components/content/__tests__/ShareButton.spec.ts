import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import ShareButton from '../ShareButton.vue'
import { setLocale } from '@/lib/i18n'
import { useToastStore } from '@/stores/toast'

// The browser's two ways, as each test wants them. jsdom has neither.
const give = (name: 'share' | 'clipboard', value: unknown) =>
  Object.defineProperty(navigator, name, { value, configurable: true, writable: true })

const mountAt = async (path: string, props: Record<string, unknown> = {}, slot?: string) => {
  const page = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chiese/:id', component: page },
      { path: '/itinerari/:id', component: page },
    ],
  })
  router.push(path)
  await router.isReady()
  const pinia = createPinia()
  const wrapper = mount(ShareButton, {
    props,
    slots: slot ? { default: slot } : undefined,
    global: { plugins: [pinia, router] },
  })
  return { wrapper, toast: useToastStore(pinia) }
}

// Review PR-16 (P-11): «Condividi» on a card and on a tour.
describe('ShareButton', () => {
  afterEach(() => {
    // @ts-expect-error — putting jsdom back the way it was found
    delete navigator.share
    // @ts-expect-error — the same
    delete navigator.clipboard
  })

  it('opens the system’s sheet with the window’s title and the card’s own address', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    give('share', share)
    document.title = 'Santissima Annunziata · Chiese · Vivere Gaeta'
    const { wrapper, toast } = await mountAt('/chiese/c1')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(share).toHaveBeenCalledWith({
      title: 'Santissima Annunziata · Chiese · Vivere Gaeta',
      url: `${window.location.origin}/chiese/c1`,
    })
    // The sheet says what happened; a toast on top of it would say it twice.
    expect(toast.isVisible).toBe(false)
  })

  // Review PR-19a: what is sent carries the sender's language, which the
  // address carries; Italian, the canonical address, carries nothing.
  it('sends the address in English, and says so in English, while English is on', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    give('clipboard', { writeText })
    await setLocale('en')
    const { wrapper, toast } = await mountAt('/chiese/c1')

    expect(wrapper.get('button').text()).toBe('Share')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    setLocale('it')

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/chiese/c1?lang=en`)
    expect(toast.message).toBe('Link copied')
  })

  it('copies the link where there is no sheet, and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    give('clipboard', { writeText })
    const { wrapper, toast } = await mountAt('/chiese/c1')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/chiese/c1`)
    expect(toast.isVisible).toBe(true)
    expect(toast.message).toBe('Link copiato')
  })

  it('shares the card, not the sender’s view of it: no enlarged map, no open form', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    give('clipboard', { writeText })
    const { wrapper } = await mountAt('/chiese/c1?mappa=1&edit=1&tappa=2')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/chiese/c1`)
  })

  it('keeps the stop when the stop is what is shared', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    give('clipboard', { writeText })
    const { wrapper } = await mountAt('/itinerari/t1?tappa=2&mappa=1', {
      query: { tappa: '2' },
    })

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/itinerari/t1?tappa=2`)
  })

  it('says how to do it by hand when the clipboard is refused', async () => {
    give('clipboard', {
      writeText: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
    })
    const { wrapper, toast } = await mountAt('/chiese/c1')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(toast.message).toBe(
      'Non è stato possibile copiare il link: copialo dalla barra degli indirizzi.',
    )
  })

  it('says nothing when the reader closes the sheet', async () => {
    give('share', vi.fn().mockRejectedValue(new DOMException('Canceled', 'AbortError')))
    const writeText = vi.fn()
    give('clipboard', { writeText })
    const { wrapper, toast } = await mountAt('/chiese/c1')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(writeText).not.toHaveBeenCalled()
    expect(toast.isVisible).toBe(false)
  })

  it('is a button named by its words, which a page may lengthen for a screen reader', async () => {
    const plain = await mountAt('/chiese/c1')
    expect(plain.wrapper.get('button').attributes('type')).toBe('button')
    expect(plain.wrapper.get('button').text()).toBe('Condividi')
    expect(plain.wrapper.get('svg').attributes('aria-hidden')).toBe('true')

    const stop = await mountAt(
      '/itinerari/t1?tappa=2',
      { query: { tappa: '2' } },
      'Condividi<span class="sr-only"> la tappa</span>',
    )
    expect(stop.wrapper.get('button').element.textContent?.trim()).toBe('Condividi la tappa')
  })
})
