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

    store.showToast(5000, 'Salvato!', 'bg-emerald-500')

    expect(store.isVisible).toBe(true)
    expect(store.message).toBe('Salvato!')

    vi.advanceTimersByTime(5000)

    expect(store.isVisible).toBe(false)
  })

  it('animates in and out through the translate class', () => {
    const store = useToastStore()

    store.showToast(5000, 'Ciao', 'bg-emerald-500')

    vi.advanceTimersByTime(10)
    expect(store.classes).toContain('-translate-y-28')

    vi.advanceTimersByTime(4490)
    expect(store.classes).not.toContain('-translate-y-28')
  })
})
