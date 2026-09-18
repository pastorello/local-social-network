import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

import FormTabs from '../FormTabs.vue'

const TABS = [
  { key: 'contenuto', label: 'Contenuto' },
  { key: 'immagini', label: 'Immagini' },
  { key: 'mappa', label: 'Mappa', hasError: true },
]

const mountTabs = () => {
  const active = ref('contenuto')
  const Host = defineComponent({
    setup: () => () =>
      h(FormTabs, {
        tabs: TABS,
        idPrefix: 'f',
        modelValue: active.value,
        'onUpdate:modelValue': (value: string) => (active.value = value),
      }),
  })
  return { wrapper: mount(Host, { attachTo: document.body }), active }
}

// ARIA's tabs pattern (design.md D19): one tab stop, arrows between tabs.
describe('FormTabs', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('is a tablist with one tab in the tab order, the selected one', () => {
    const { wrapper } = mountTabs()
    const tabs = wrapper.findAll('[role="tab"]')

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
    expect(tabs.map((tab) => tab.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    expect(tabs[0]!.attributes('aria-controls')).toBe('f-panel-contenuto')
  })

  it('moves with the arrows, wraps around, and jumps with Home and End', async () => {
    const { wrapper, active } = mountTabs()
    const tabs = () => wrapper.findAll('[role="tab"]')

    await tabs()[0]!.trigger('keydown', { key: 'ArrowRight' })
    expect(active.value).toBe('immagini')
    expect(document.activeElement).toBe(tabs()[1]!.element)

    await tabs()[1]!.trigger('keydown', { key: 'End' })
    expect(active.value).toBe('mappa')

    await tabs()[2]!.trigger('keydown', { key: 'ArrowRight' })
    expect(active.value).toBe('contenuto')

    await tabs()[0]!.trigger('keydown', { key: 'ArrowLeft' })
    expect(active.value).toBe('mappa')
  })

  it('says in words that a tab holds a rejected field, not only with a red dot', () => {
    const { wrapper } = mountTabs()

    expect(wrapper.findAll('[role="tab"]')[2]!.text()).toContain('(contiene un errore)')
  })
})
