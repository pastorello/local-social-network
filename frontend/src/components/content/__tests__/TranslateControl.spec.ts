import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'

import TranslateControl from '../TranslateControl.vue'
import type { TranslationRef } from '@/definitions/interfaces/Content'

vi.mock('axios')

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/chiese/:id', name: 'chiesedetail', component: stub }],
  })

describe('TranslateControl', () => {
  it('offers to translate into English when no translation exists yet', () => {
    const wrapper = mount(TranslateControl, {
      props: {
        translateEndpoint: '/api/chiese/1/traduci/',
        translations: [],
        detailRouteName: 'chiesedetail',
      },
      global: { plugins: [createPinia(), makeRouter()] },
    })

    expect(wrapper.text()).toContain('Traduci in Inglese')
  })

  it('links to an existing draft translation instead of offering to start one', () => {
    const translations: TranslationRef[] = [
      { id: '2', language: 'en', title: '', is_published: false },
    ]

    const wrapper = mount(TranslateControl, {
      props: {
        translateEndpoint: '/api/chiese/1/traduci/',
        translations,
        detailRouteName: 'chiesedetail',
      },
      global: { plugins: [createPinia(), makeRouter()] },
    })

    expect(wrapper.text()).not.toContain('Traduci in Inglese')
    expect(wrapper.text()).toContain('Vai alla traduzione in Inglese (bozza)')
  })

  it('links to a published translation without the draft suffix', () => {
    const translations: TranslationRef[] = [
      { id: '2', language: 'en', title: 'English version', is_published: true },
    ]

    const wrapper = mount(TranslateControl, {
      props: {
        translateEndpoint: '/api/chiese/1/traduci/',
        translations,
        detailRouteName: 'chiesedetail',
      },
      global: { plugins: [createPinia(), makeRouter()] },
    })

    expect(wrapper.text()).toContain('Vai alla traduzione in Inglese')
    expect(wrapper.text()).not.toContain('(bozza)')
  })

  it('starts a translation and navigates to it in edit mode', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { id: '2' } })
    const router = makeRouter()
    const pushSpy = vi.spyOn(router, 'push')

    const wrapper = mount(TranslateControl, {
      props: {
        translateEndpoint: '/api/chiese/1/traduci/',
        translations: [],
        detailRouteName: 'chiesedetail',
      },
      global: { plugins: [createPinia(), router] },
    })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith('/api/chiese/1/traduci/', { language: 'en' })
    expect(pushSpy).toHaveBeenCalledWith({
      name: 'chiesedetail',
      params: { id: '2' },
      query: { edit: '1' },
    })
  })
})
