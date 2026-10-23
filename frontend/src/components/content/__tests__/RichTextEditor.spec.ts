import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import RichTextEditor from '../RichTextEditor.vue'

// Tiptap mounts its ProseMirror view asynchronously after the component
// mounts — a single $nextTick isn't always enough for jsdom to reflect it.
const flushEditor = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('RichTextEditor', () => {
  it('renders a toolbar and the initial content', async () => {
    const wrapper = mount(RichTextEditor, {
      props: { modelValue: '<p>Ciao</p>' },
    })
    await flushEditor()

    expect(wrapper.text()).toContain('Ciao')
    expect(wrapper.findAll('button').length).toBeGreaterThan(0)
  })

  it('renders an editable content area', async () => {
    const wrapper = mount(RichTextEditor, {
      props: { modelValue: '' },
    })
    await flushEditor()

    const content = wrapper.find('[contenteditable="true"]')
    expect(content.exists()).toBe(true)
  })

  // Review PR-13 (C-01): icons, so the nine tools sit on one row in the
  // editor's panel, each named in words; with no text on the button its name is
  // the whole label (WCAG 2.5.3), and the tooltip shows that name, word for word.
  it('draws its tools as icons, each named in words that its tooltip shows', async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: '' } })
    await flushEditor()

    const tools = wrapper.findAll('[role="toolbar"] button')
    expect(tools.map((tool) => tool.attributes('aria-label'))).toEqual([
      'Grassetto',
      'Corsivo',
      'Barrato',
      'Titolo H2',
      'Titolo H3',
      'Lista puntata',
      'Lista numerata',
      'Citazione',
      'Link',
    ])
    for (const tool of tools) {
      expect(tool.find('svg[aria-hidden="true"]').exists()).toBe(true)
      expect(tool.get('span').text()).toBe(tool.attributes('aria-label'))
      expect(tool.attributes('aria-pressed')).toBe('false')
    }
  })

  // WCAG 1.4.13: a tooltip on show is put away without moving the focus. Its
  // Escape is not the panel's — the panel closes on Escape (RoutePanel.vue) —
  // until there is no tooltip left to put away.
  it('puts a tooltip away on Escape, and only then lets Escape reach the panel', async () => {
    const wrapper = mount(RichTextEditor, {
      props: { modelValue: '' },
      attachTo: document.body,
    })
    await flushEditor()
    const bold = wrapper.get('button[aria-label="Grassetto"]')
    ;(bold.element as HTMLButtonElement).focus()
    const escape = () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      bold.element.dispatchEvent(event)
      return event
    }

    expect(bold.get('span').classes()).toContain('group-focus-visible:block')
    expect(escape().defaultPrevented).toBe(true)
    await nextTick()
    expect(bold.get('span').classes()).not.toContain('group-focus-visible:block')
    expect(escape().defaultPrevented).toBe(false)

    wrapper.unmount()
  })
})
