import { afterEach, describe, expect, it, vi } from 'vitest'

import { afterFirstPaint } from '../firstPaint'

const settled = async (promise: Promise<void>) => {
  let done = false
  promise.then(() => (done = true))
  await new Promise((resolve) => setTimeout(resolve, 0))
  return done
}

// A browser that knows the Paint Timing API; `deliver` plays its entries.
let deliver = (_names: string[]) => {}
class FakeObserver {
  static supportedEntryTypes = ['paint']
  constructor(callback: (list: { getEntriesByName: (n: string) => unknown[] }) => void) {
    deliver = (names) => callback({ getEntriesByName: (n) => names.filter((m) => m === n) })
  }
  observe() {}
  disconnect() {}
}

// Frames are held until a test lets them run, as in a hidden tab.
const holdFrames = () => {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
  return () => frames.splice(0).forEach((frame) => frame(0))
}

describe('afterFirstPaint (TD-52)', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('waits for the first contentful paint, not for any paint entry', async () => {
    vi.stubGlobal('PerformanceObserver', FakeObserver)
    holdFrames()

    const painted = afterFirstPaint()
    deliver(['first-paint'])
    expect(await settled(painted)).toBe(false)

    deliver(['first-contentful-paint'])
    expect(await settled(painted)).toBe(true)
  })

  it('comes a second after the first frame if the entry never does', async () => {
    vi.stubGlobal('PerformanceObserver', FakeObserver)
    const runFrames = holdFrames()
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    let done = false
    afterFirstPaint().then(() => (done = true))

    runFrames()
    await vi.advanceTimersByTimeAsync(999)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
  })

  it('falls back to the frame after the next one without the Paint Timing API', async () => {
    vi.stubGlobal('PerformanceObserver', undefined)
    const runFrames = holdFrames()

    const painted = afterFirstPaint()
    expect(await settled(painted)).toBe(false)

    runFrames()
    expect(await settled(painted)).toBe(true)
  })
})
