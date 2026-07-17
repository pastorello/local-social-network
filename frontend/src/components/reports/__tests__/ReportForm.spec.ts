import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import axios from 'axios'

import ReportForm from '../ReportForm.vue'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

const categories = [
  { id: 'cat-1', name: 'Strade e marciapiedi', color: '#ef4444' },
  { id: 'cat-2', name: 'Verde pubblico', color: '#22c55e' },
]

const mountForm = () =>
  mount(ReportForm, {
    props: {
      categories,
      coords: { lat: 41.21, lng: 13.56 },
    },
    global: { plugins: [createPinia()] },
  })

describe('ReportForm', () => {
  it('renders the fields with the available categories', () => {
    const wrapper = mountForm()

    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.findAll('option')).toHaveLength(3) // placeholder + 2 categories
    expect(wrapper.text()).toContain('Invia segnalazione')
  })

  it('blocks submission and shows errors when required fields are empty', async () => {
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')

    expect(axios.post).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Il titolo è obbligatorio.')
    expect(wrapper.text()).toContain('La descrizione è obbligatoria.')
    expect(wrapper.text()).toContain('Scegli una categoria.')
  })

  it('emits cancel when the Annulla button is pressed', async () => {
    const wrapper = mountForm()

    await wrapper.find('button[type="button"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
