import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useToastStore } from '../toast'

describe('toast store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('showToast makes the message visible and hides it after ms', () => {
    const store = useToastStore()

    store.showToast(5000, 'Salvato!')

    expect(store.isVisible).toBe(true)
    expect(store.message).toBe('Salvato!')

    vi.advanceTimersByTime(5000)

    expect(store.isVisible).toBe(false)
  })

  it("a second toast is not cut short by the first one's timers", () => {
    const store = useToastStore()

    store.showToast(5000, 'Primo')
    vi.advanceTimersByTime(4600) // most of the way through the first one
    store.showToast(5000, 'Secondo')

    // The first toast's remaining timers used to fire against the second one,
    // hiding it ~400ms in (TD-31).
    vi.advanceTimersByTime(1000)
    expect(store.isVisible).toBe(true)
    expect(store.message).toBe('Secondo')

    vi.advanceTimersByTime(4000)
    expect(store.isVisible).toBe(false)
  })
})
