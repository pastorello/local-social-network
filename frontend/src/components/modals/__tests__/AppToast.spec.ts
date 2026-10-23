import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import AppToast from '../AppToast.vue'
import { useToastStore } from '@/stores/toast'

// Review PR-8 (A-02, L-10): a pale pink box in the bottom-right corner, out of
// sight of a panel open in the middle and judged for contrast by eye.
describe('AppToast', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps its live region in the document, so a message arriving in it is announced', async () => {
    const wrapper = mount(AppToast)
    const region = wrapper.get('[role="status"]')

    expect(region.attributes('aria-live')).toBe('polite')
    expect(region.text()).toBe('')

    useToastStore().showToast(5000, 'Scheda eliminata')
    await wrapper.vm.$nextTick()

    // The same element, not a new one carrying its words in with it.
    expect(wrapper.get('[role="status"]').element).toBe(region.element)
    expect(region.text()).toBe('Scheda eliminata')

    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    expect(region.text()).toBe('')
  })

  it('sits under the pill in the middle, no wider than 480px, in the toast’s tokens', async () => {
    const wrapper = mount(AppToast)
    useToastStore().showToast(5000, 'Accedi per votare nei sondaggi')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[role="status"]').classes()).toEqual(
      expect.arrayContaining([
        'fixed',
        'inset-x-0',
        'top-[var(--header-h,4.5rem)]',
        'justify-center',
      ]),
    )
    expect(wrapper.get('p').classes()).toEqual(
      expect.arrayContaining(['max-w-[30rem]', 'bg-toast-bg', 'text-toast-fg']),
    )
  })

  it('takes no pointer, so for its five seconds it covers nothing', () => {
    const wrapper = mount(AppToast)

    expect(wrapper.get('[role="status"]').classes()).toContain('pointer-events-none')
  })
})
