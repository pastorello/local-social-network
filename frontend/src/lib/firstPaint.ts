/**
 * Resolves once the reader has something on screen (TD-52): the Paint Timing
 * API's first contentful paint — the moment the browser *presented* a frame
 * with text in it, not the moment the main thread finished painting one — and
 * at once if that has already happened. Nothing resolves while the page is
 * hidden: a tab opened in the background waits until it is shown.
 */
export const afterFirstPaint = (): Promise<void> =>
  new Promise((resolve) => {
    // Frames only come while the page is visible.
    const afterFrame = (delay: number) => requestAnimationFrame(() => setTimeout(resolve, delay))
    if (
      typeof PerformanceObserver === 'undefined' ||
      !PerformanceObserver.supportedEntryTypes?.includes('paint')
    ) {
      // Without the API, the frame after the next one is the closest stand-in.
      afterFrame(0)
      return
    }
    const observer = new PerformanceObserver((list) => {
      if (!list.getEntriesByName('first-contentful-paint').length) return
      observer.disconnect()
      resolve()
    })
    // `buffered` replays a paint that came before this call.
    observer.observe({ type: 'paint', buffered: true })
    // Should a browser that has the API never deliver the entry, what waits on
    // this comes a second late rather than never.
    afterFrame(1000)
  })
