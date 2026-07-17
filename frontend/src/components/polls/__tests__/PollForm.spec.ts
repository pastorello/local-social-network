import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import axios from 'axios'

import PollForm from '../PollForm.vue'

vi.mock('axios', () => ({
  default: { post: vi.fn() },
}))

const optionInputs = (wrapper: ReturnType<typeof mountForm>) =>
  wrapper.findAll('input[placeholder^="Opzione"]')

const mountForm = () =>
  mount(PollForm, {
    global: { plugins: [createPinia()] },
  })

describe('PollForm', () => {
  it('renders the question field and two option fields to start', () => {
    const wrapper = mountForm()

    expect(wrapper.find('input[placeholder^="Es."]').exists()).toBe(true)
    expect(optionInputs(wrapper)).toHaveLength(2)
    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Crea sondaggio')
  })

  it('adds and removes option fields within the 2–10 range', async () => {
    const wrapper = mountForm()

    await wrapper.find('button[type="button"].underline').trigger('click')
    expect(optionInputs(wrapper)).toHaveLength(3)

    await wrapper.find('button[aria-label="Rimuovi opzione 3"]').trigger('click')
    expect(optionInputs(wrapper)).toHaveLength(2)
    // with only 2 options left, the remove buttons disappear
    expect(wrapper.find('button[aria-label^="Rimuovi"]').exists()).toBe(false)
  })

  it('blocks submission and shows errors when the form is empty', async () => {
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')

    expect(axios.post).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('La domanda è obbligatoria.')
    expect(wrapper.text()).toContain('Inserisci almeno 2 opzioni.')
  })

  it('emits cancel when the Annulla button is pressed', async () => {
    const wrapper = mountForm()

    await wrapper.find('button.bg-gray-200:not([aria-label])').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
