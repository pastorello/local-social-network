import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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

// By what the button says, not by its Tailwind classes: a restyle should not
// break a test of behaviour (TD-48).
const buttonNamed = (wrapper: ReturnType<typeof mountForm>, text: string) =>
  wrapper.findAll('button[type="button"]').find((button) => button.text() === text)!

describe('PollForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the question field and two option fields to start', () => {
    const wrapper = mountForm()

    expect(wrapper.find('input[placeholder^="Es."]').exists()).toBe(true)
    expect(optionInputs(wrapper)).toHaveLength(2)
    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Crea sondaggio')
  })

  it('adds and removes option fields within the 2–10 range', async () => {
    const wrapper = mountForm()

    await buttonNamed(wrapper, '+ Aggiungi opzione').trigger('click')
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

    await buttonNamed(wrapper, 'Annulla').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  // TD-48: what the admin's form sends — trimmed, blanks dropped, the closing
  // date as an ISO instant, or null when there is none.
  it('creates the poll with its trimmed options and no closing date', async () => {
    const saved = { id: 'p1', question: 'Dove costruire la nuova area giochi?' }
    vi.mocked(axios.post).mockResolvedValueOnce({ data: saved })
    const wrapper = mountForm()

    await wrapper.get('#poll-question').setValue('  Dove costruire la nuova area giochi?  ')
    await buttonNamed(wrapper, '+ Aggiungi opzione').trigger('click')
    await wrapper.get('#poll-option-0').setValue(' Villa comunale ')
    await wrapper.get('#poll-option-1').setValue('   ')
    await wrapper.get('#poll-option-2').setValue('Lungomare')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith('/api/polls/', {
      question: 'Dove costruire la nuova area giochi?',
      options: ['Villa comunale', 'Lungomare'],
      closes_at: null,
    })
    expect(wrapper.emitted('saved')).toEqual([[saved]])
  })

  it('sends the closing date as an ISO instant', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { id: 'p1' } })
    const wrapper = mountForm()

    await wrapper.get('#poll-question').setValue('Quale festa ti manca di più?')
    await wrapper.get('#poll-option-0').setValue('Porto Salvo')
    await wrapper.get('#poll-option-1').setValue('Sant’Erasmo')
    await wrapper.get('#poll-closes-at').setValue('2026-12-31T18:00')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const body = vi.mocked(axios.post).mock.calls[0]![1] as { closes_at: string }
    expect(body.closes_at).toBe(new Date('2026-12-31T18:00').toISOString())
  })
})
