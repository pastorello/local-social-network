import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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

const mountForm = (props: Record<string, unknown> = {}) =>
  mount(ReportForm, {
    props: {
      categories,
      coords: { lat: 41.21, lng: 13.56 },
      ...props,
    },
    global: { plugins: [createPinia()] },
  })

const fillIn = async (wrapper: ReturnType<typeof mountForm>) => {
  await wrapper.get('#report-title').setValue('  Buca in via Indipendenza  ')
  await wrapper.get('#report-description').setValue('Una buca profonda vicino al civico 12.')
  await wrapper.get('#report-category').setValue('cat-2')
}

// jsdom has no file picker: put the file where the form reads it from.
const pickPhoto = async (wrapper: ReturnType<typeof mountForm>, file: File) => {
  const input = wrapper.get('#report-photo')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}

const sentBody = (call: 'post' | 'patch') => vi.mocked(axios[call]).mock.calls[0]![1] as FormData

describe('ReportForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // useFileUpload previews the photo through an object URL.
    URL.createObjectURL = vi.fn(() => 'blob:anteprima')
  })

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

  it('shows the message the API sent when the body carries only `detail`', async () => {
    // PermissionDenied bodies have no `fields` key. The hand-rolled extractor
    // this form used to carry read only `fields`, so a citizen who submitted
    // just after an admin acknowledged the report saw the generic fallback
    // instead of the sentence the backend wrote (TD-21).
    vi.mocked(axios.post).mockRejectedValueOnce({
      response: {
        data: { detail: 'La segnalazione non è più modificabile: è già stata presa in carico.' },
      },
    })
    const wrapper = mountForm()

    await wrapper.find('input[type="text"]').setValue('Buca in via Indipendenza')
    await wrapper.find('textarea').setValue('Una buca profonda vicino al civico 12.')
    await wrapper.find('select').setValue('cat-1')
    await wrapper.find('form').trigger('submit')
    await new Promise((resolve) => setTimeout(resolve))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('non è più modificabile')
    expect(wrapper.text()).not.toContain('Si è verificato un errore')
  })

  // TD-48: the form a reader files with, and until now nothing asserted what it
  // sends — field names, the coordinates as strings, the photo only when there
  // is one, multipart.
  it('files a new report with the place it was opened on', async () => {
    const saved = { id: 'r1', title: 'Buca in via Indipendenza' }
    vi.mocked(axios.post).mockResolvedValueOnce({ data: saved })
    const wrapper = mountForm()

    await fillIn(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, , config] = vi.mocked(axios.post).mock.calls[0]!
    expect(url).toBe('/api/reports/')
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } })
    const body = sentBody('post')
    expect(body.get('title')).toBe('Buca in via Indipendenza')
    expect(body.get('description')).toBe('Una buca profonda vicino al civico 12.')
    expect(body.get('category')).toBe('cat-2')
    expect(body.get('lat')).toBe('41.21')
    expect(body.get('lng')).toBe('13.56')
    expect(body.has('photo')).toBe(false)
    expect(wrapper.emitted('saved')).toEqual([[saved]])
  })

  it('sends the photo when one is picked', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { id: 'r1' } })
    const wrapper = mountForm()
    const photo = new File(['jpeg'], 'buca.jpg', { type: 'image/jpeg' })

    await fillIn(wrapper)
    await pickPhoto(wrapper, photo)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const sent = sentBody('post').get('photo') as File
    expect(sent.name).toBe('buca.jpg')
    expect(sent.type).toBe('image/jpeg')
  })

  it('edits an existing report in place', async () => {
    vi.mocked(axios.patch).mockResolvedValueOnce({ data: { id: 'r9' } })
    const report = {
      id: 'r9',
      title: 'Lampione spento',
      description: 'Da una settimana.',
      category: categories[0],
    }
    const wrapper = mountForm({ report })

    expect(wrapper.text()).toContain('Salva modifiche')
    await wrapper.get('#report-title').setValue('Lampione spento in piazza')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(axios.post).not.toHaveBeenCalled()
    expect(vi.mocked(axios.patch).mock.calls[0]![0]).toBe('/api/reports/r9/')
    const body = sentBody('patch')
    expect(body.get('title')).toBe('Lampione spento in piazza')
    expect(body.get('description')).toBe('Da una settimana.')
    expect(body.get('category')).toBe('cat-1')
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })
})
