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

  it('a second toast is not cut short by the first one\'s timers', () => {
    const store = useToastStore()

    store.showToast(5000, 'Primo', 'bg-emerald-500')
    vi.advanceTimersByTime(4600)   // past the first toast's fade-out timer
    store.showToast(5000, 'Secondo', 'bg-red-300')

    // The first toast's remaining timers used to fire against the second one,
    // hiding it ~400ms in and stripping its classes (TD-31).
    vi.advanceTimersByTime(1000)
    expect(store.isVisible).toBe(true)
    expect(store.message).toBe('Secondo')

    vi.advanceTimersByTime(4000)
    expect(store.isVisible).toBe(false)
  })

  it('classes are rebuilt from the base rather than accumulated', () => {
    const store = useToastStore()

    store.showToast(5000, 'Uno', 'bg-emerald-500')
    vi.advanceTimersByTime(10)
    store.showToast(5000, 'Due', 'bg-red-300')
    vi.advanceTimersByTime(10)

    expect(store.classes).toBe('bg-red-300 -translate-y-28')
    expect(store.classes).not.toContain('bg-emerald-500')
  })
})
