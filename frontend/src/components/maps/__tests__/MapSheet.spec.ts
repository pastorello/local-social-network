import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import MapSheet from '../MapSheet.vue'
import { useMapStore } from '@/stores/map'

describe('MapSheet tells the map how tall it is (review PR-5, M-01)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('at each stop it comes to rest on, and not once it is gone', async () => {
    const store = useMapStore()
    const wrapper = mount(MapSheet, { props: { title: 'La mappa di Gaeta' } })

    // It opens at its middle stop, 45% of the screen.
    expect(store.sheetHeight).toBe(0.45 * window.innerHeight)

    await wrapper.get('button').trigger('click')
    expect(store.sheetHeight).toBe(0.85 * window.innerHeight)

    await wrapper.get('button').trigger('click')
    // Its lowest stop is 6.375rem: the 44px handle and two whole lines of
    // text (review PR-15).
    expect(store.sheetHeight).toBe(102)

    wrapper.unmount()
    expect(store.sheetHeight).toBeNull()
  })
})

// Review PR-15 (M-11): a 36 × 4px bar did not say that it drags. The handle
// is named for it, and the first time in a session a line under it says so,
// until the reader drags.
describe('MapSheet’s handle says that it drags (review PR-15)', () => {
  const HINT = 'Trascina per vedere più mappa'

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    // jsdom has no pointer capture, and lays nothing out: the sheet is as tall
    // as its middle stop, where it opens.
    HTMLElement.prototype.setPointerCapture = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(
      0.45 * window.innerHeight,
    )
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mountSheet = () => mount(MapSheet, { props: { title: 'La mappa di Gaeta' } })
  const hint = (wrapper: ReturnType<typeof mountSheet>) =>
    wrapper.findAll('p').filter((p) => p.text() === HINT)
  // Dispatched by hand: test-utils' trigger cannot set a pointer event's
  // clientY.
  const pointer = (type: string, clientY: number) =>
    new PointerEvent(type, { clientY, pointerId: 1, bubbles: true })
  const drag = async (wrapper: ReturnType<typeof mountSheet>, by: number) => {
    const handle = wrapper.get('button')
    handle.element.dispatchEvent(pointer('pointerdown', 400))
    handle.element.dispatchEvent(pointer('pointermove', 400 + by))
    handle.element.dispatchEvent(pointer('pointerup', 400 + by))
    // The browser ends a press on its button with a click, drag or not.
    await handle.trigger('click')
  }

  it('is named for the drag, and says what pressing it does now', async () => {
    const wrapper = mountSheet()
    const handle = wrapper.get('button')

    expect(handle.attributes('aria-label')).toBe(HINT)
    const action = () => wrapper.get(`#${handle.attributes('aria-describedby')}`).text()
    expect(action()).toBe('Espandi l’elenco')

    await handle.trigger('click')
    expect(action()).toBe('Riduci l’elenco')
  })

  it('shows the line under the handle the first time, and takes it away at the first drag', async () => {
    const wrapper = mountSheet()
    expect(hint(wrapper)).toHaveLength(1)
    // Assistive technology has the handle's name for it.
    expect(hint(wrapper)[0]!.attributes('aria-hidden')).toBe('true')

    await drag(wrapper, -120)

    expect(hint(wrapper)).toHaveLength(0)
  })

  it('keeps the line through a press, which is not a drag', async () => {
    const wrapper = mountSheet()

    await wrapper.get('button').trigger('click')

    expect(hint(wrapper)).toHaveLength(1)
  })

  it('shows it once a session: not again on the next visit', () => {
    mountSheet().unmount()

    expect(hint(mountSheet())).toHaveLength(0)
  })

  it('works without storage: the line shows, and the drag still takes it away', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const wrapper = mountSheet()
    expect(hint(wrapper)).toHaveLength(1)

    await drag(wrapper, -120)

    expect(hint(wrapper)).toHaveLength(0)
    expect(useMapStore().sheetHeight).toBe(0.45 * window.innerHeight)
  })

  it('is not shown at the lowest stop, where the sheet shows its first line', async () => {
    const wrapper = mountSheet()
    const handle = wrapper.get('button')

    await handle.trigger('click')
    await handle.trigger('click')

    expect(useMapStore().sheetHeight).toBe(102)
    expect(hint(wrapper)).toHaveLength(0)
  })

  // A drag ends on a click too, and the drag has already chosen its stop: the
  // sheet used to move on to the next one as well.
  it('rests where a drag leaves it, without the click after it moving it on', async () => {
    const wrapper = mountSheet()
    const store = useMapStore()

    // Pulled up a little from the middle stop: still nearest the middle.
    await drag(wrapper, -40)
    expect(store.sheetHeight).toBe(0.45 * window.innerHeight)

    // And a press after it is a press again.
    await wrapper.get('button').trigger('click')
    expect(store.sheetHeight).toBe(0.85 * window.innerHeight)
  })
})

// Review PR-21b: the home moves the sheet — down to the map on «Vai alla
// mappa», up for the question — and at the lowest stop it shows its first
// line, whatever had been scrolled to (design.md D3's note of 2026-10-23).
describe('MapSheet moved by the home (review PR-21b)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('steps down and up when told, and shows its first line at the lowest stop', async () => {
    const store = useMapStore()
    const wrapper = mount(MapSheet, {
      props: { title: 'La mappa di Gaeta' },
      slots: { default: '<p>Prima riga</p>' },
    })
    const content = wrapper.get('section > div').element as HTMLElement
    content.scrollTop = 300

    ;(wrapper.vm as unknown as { collapse: () => void }).collapse()
    await wrapper.vm.$nextTick()
    expect(store.sheetHeight).toBe(102)
    expect(content.scrollTop).toBe(0)

    ;(wrapper.vm as unknown as { open: () => void }).open()
    await wrapper.vm.$nextTick()
    expect(store.sheetHeight).toBe(0.45 * window.innerHeight)
  })
})
