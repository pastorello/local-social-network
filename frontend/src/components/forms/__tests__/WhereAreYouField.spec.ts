import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import WhereAreYouField from '../WhereAreYouField.vue'

const ZONES = [
  { slug: 'gaeta-medievale', name: 'Gaeta Medievale' },
  { slug: 'serapo', name: 'Serapo' },
  { slug: 'porto-salvo', name: 'Porto Salvo' },
]
const ALIASES = [
  { name: 'il Borgo', zone: 'porto-salvo' },
  { name: 'il castello', zone: 'gaeta-medievale' },
  { name: 'la Cattedrale', zone: 'gaeta-medievale' },
  { name: 'Serapo', zone: 'serapo' },
]

const mountField = (current: string | null = null) =>
  mount(WhereAreYouField, {
    props: { aliases: ALIASES, zones: ZONES, current },
    attachTo: document.body,
  })

const input = (wrapper: VueWrapper) => wrapper.get('input')
const type = async (wrapper: VueWrapper, text: string) => {
  await input(wrapper).setValue(text)
}
const key = async (wrapper: VueWrapper, name: string, init: KeyboardEventInit = {}) => {
  await input(wrapper).trigger('keydown', { key: name, ...init })
}
const options = (wrapper: VueWrapper) => wrapper.findAll('[role="option"]')
const liveCount = (wrapper: VueWrapper) => wrapper.findAll('[aria-live="polite"]')[0]!.text()
const outcome = (wrapper: VueWrapper) => wrapper.findAll('[aria-live="polite"]')[1]!.text()

// ARIA's combobox pattern (review PR-20; ADR-0005): one tab stop, arrows,
// Enter, Escape, and the number of matches said in a live region.
describe('WhereAreYouField — «Dove sei?»', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('is one labelled combobox, its listbox closed, and the only thing in the tab order', () => {
    const wrapper = mountField()
    const box = input(wrapper)

    expect(box.attributes('role')).toBe('combobox')
    expect(box.attributes('aria-autocomplete')).toBe('list')
    expect(box.attributes('aria-expanded')).toBe('false')
    expect(document.getElementById(box.attributes('aria-controls')!)?.getAttribute('role')).toBe(
      'listbox',
    )
    expect(wrapper.get(`label[for="${box.attributes('id')}"]`).text()).toBe('Dove sei?')
    expect(options(wrapper)).toHaveLength(0)
    expect(wrapper.findAll('[tabindex]')).toHaveLength(0)
  })

  it('opens on typing, selects the first match, and says how many there are', async () => {
    const wrapper = mountField()

    await type(wrapper, 'ca')

    expect(input(wrapper).attributes('aria-expanded')).toBe('true')
    // Each option names its zone: «, » for a screen reader, « · » to the eye.
    expect(options(wrapper).map((o) => o.text().replace(/\s+/g, ' '))).toEqual([
      'Il castello, · Gaeta Medievale',
      'La Cattedrale, · Gaeta Medievale',
    ])
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(
      options(wrapper)[0]!.attributes('id'),
    )
    expect(options(wrapper)[0]!.attributes('aria-selected')).toBe('true')
    expect(liveCount(wrapper)).toBe('2 posti: le frecce per scorrerli, Invio per sceglierne uno.')
  })

  it('moves through the options with the arrows, wrapping, without moving focus', async () => {
    const wrapper = mountField()
    input(wrapper).element.focus()
    await type(wrapper, 'ca')

    await key(wrapper, 'ArrowDown')
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(
      options(wrapper)[1]!.attributes('id'),
    )
    await key(wrapper, 'ArrowDown')
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(
      options(wrapper)[0]!.attributes('id'),
    )
    await key(wrapper, 'ArrowUp')
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(
      options(wrapper)[1]!.attributes('id'),
    )
    expect(document.activeElement).toBe(input(wrapper).element)
  })

  it('chooses with Enter: the zone goes to the page, the name stays in the field', async () => {
    const wrapper = mountField()

    await type(wrapper, 'castello')
    await key(wrapper, 'Enter')

    expect(wrapper.emitted('choose')).toEqual([['gaeta-medievale']])
    expect((input(wrapper).element as HTMLInputElement).value).toBe('Il castello')
    expect(input(wrapper).attributes('aria-expanded')).toBe('false')

    // The line speaks once the page shows that zone.
    await wrapper.setProps({ current: 'gaeta-medievale' })
    expect(outcome(wrapper)).toBe('Sei al castello: ti mostriamo Gaeta Medievale.')
  })

  it('takes the first match on Enter even with the list closed, and a zone by its own name', async () => {
    const wrapper = mountField('serapo')

    await type(wrapper, 'porto')
    await key(wrapper, 'Escape')
    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
    await key(wrapper, 'Enter')

    expect(wrapper.emitted('choose')).toEqual([['porto-salvo']])
    await wrapper.setProps({ current: 'porto-salvo' })
    expect(outcome(wrapper)).toBe('Ti mostriamo Porto Salvo.')
  })

  it('changes nothing for a name nobody listed, and says to use the zones', async () => {
    const wrapper = mountField('serapo')

    await type(wrapper, 'xyz')
    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
    expect(liveCount(wrapper)).toBe('Nessun posto con questo nome.')
    await key(wrapper, 'Enter')

    expect(wrapper.emitted('choose')).toBeUndefined()
    expect(outcome(wrapper)).toBe('Non conosciamo questo posto: scegli una zona qui sotto.')
  })

  it('closes the list on Escape, then clears what was typed — and keeps the Escape it used', async () => {
    const wrapper = mountField()
    await type(wrapper, 'ca')

    const first = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    input(wrapper).element.dispatchEvent(first)
    await wrapper.vm.$nextTick()
    expect(first.defaultPrevented).toBe(true)
    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
    expect((input(wrapper).element as HTMLInputElement).value).toBe('ca')

    await key(wrapper, 'Escape')
    expect((input(wrapper).element as HTMLInputElement).value).toBe('')

    // With nothing to close or clear, Escape is the panel's.
    const last = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    input(wrapper).element.dispatchEvent(last)
    expect(last.defaultPrevented).toBe(false)
  })

  it('opens every name with the down arrow, Alt+down without selecting one', async () => {
    const wrapper = mountField()

    await key(wrapper, 'ArrowDown', { altKey: true })
    // The four names, and the two zones nobody named.
    expect(options(wrapper)).toHaveLength(6)
    expect(input(wrapper).attributes('aria-activedescendant')).toBeUndefined()
    expect(liveCount(wrapper)).toBe('6 posti: le frecce per scorrerli, Invio per sceglierne uno.')

    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'Enter')
    expect(wrapper.emitted('choose')).toEqual([['porto-salvo']])
  })

  it('chooses with a click, keeping focus in the field', async () => {
    const wrapper = mountField()
    await type(wrapper, 'cat')

    await options(wrapper)[0]!.trigger('mousedown')
    await options(wrapper)[0]!.trigger('click')

    expect(wrapper.emitted('choose')).toEqual([['gaeta-medievale']])
  })

  it('lets the line go when the page shows another zone, chosen some other way', async () => {
    const wrapper = mountField()
    await type(wrapper, 'borgo')
    await key(wrapper, 'Enter')
    await wrapper.setProps({ current: 'porto-salvo' })
    expect(outcome(wrapper)).toBe('Sei al Borgo: ti mostriamo Porto Salvo.')

    await wrapper.setProps({ current: 'serapo' })

    expect(outcome(wrapper)).toBe('')
    expect((input(wrapper).element as HTMLInputElement).value).toBe('')
  })
})

// On a phone a chosen zone puts the ways of choosing away (cosa-fare.md D5,
// review PR-20): folded, the field goes and what it said stays.
describe('WhereAreYouField, folded', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const mountFolding = () =>
    mount(WhereAreYouField, {
      props: { aliases: ALIASES, zones: ZONES, current: null, askId: 'dove-sei' },
      attachTo: document.body,
    })

  it('hides the question and keeps the line', async () => {
    const wrapper = mountFolding()
    await type(wrapper, 'castello')
    await key(wrapper, 'Enter')
    await wrapper.setProps({ current: 'gaeta-medievale' })

    await wrapper.setProps({ folded: true })

    expect(wrapper.get('#dove-sei').isVisible()).toBe(false)
    expect(outcome(wrapper)).toBe('Sei al castello: ti mostriamo Gaeta Medievale.')
  })

  it('closes a list left open', async () => {
    const wrapper = mountFolding()
    await type(wrapper, 'ca')
    expect(input(wrapper).attributes('aria-expanded')).toBe('true')

    await wrapper.setProps({ folded: true })

    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
    expect(options(wrapper)).toHaveLength(0)
  })
})
