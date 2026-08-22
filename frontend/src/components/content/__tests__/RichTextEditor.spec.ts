import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

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
})
