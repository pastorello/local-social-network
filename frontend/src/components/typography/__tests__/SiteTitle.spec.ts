import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import axe from 'axe-core'

import SiteTitle from '../SiteTitle.vue'

const mountTitle = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  router.push('/')
  await router.isReady()
  return mount(SiteTitle, { global: { plugins: [router] }, attachTo: document.body })
}

// Review PR-8 (A-01): a screen reader announced the wordmark as «ivere aeta,
// link» — the coloured initials fell out of its name. The names here are
// computed by axe-core, the a11y gate's own engine, not read off an attribute.
describe('SiteTitle', () => {
  afterEach(() => {
    axe.teardown()
    document.body.innerHTML = ''
  })

  it('is named «Vivere Gaeta», then where it leads', async () => {
    const wrapper = await mountTitle()
    const link = wrapper.get('a').element
    axe.setup(document)

    const name = axe.commons.text.accessibleText(link)
    expect(name).toBe('Vivere Gaeta — torna alla mappa')
    // WCAG 2.5.3: what is shown is in the name, at its start — a speech-input
    // user says «Vivere Gaeta» and reaches it.
    expect(name.startsWith('Vivere Gaeta')).toBe(true)
  })

  it('spells the whole name in its letters too, initials in plain spans told apart by colour alone', async () => {
    const wrapper = await mountTitle()
    const link = wrapper.get('a').element
    // What its letters alone would say, with no label to lean on — the name
    // that came out as «ivere aeta».
    link.removeAttribute('aria-label')
    axe.setup(document)

    expect(axe.commons.text.accessibleText(link)).toBe('Vivere Gaeta')
    wrapper.findAll('a span').forEach((initial) => {
      expect(initial.classes()).toEqual(['text-terracotta'])
      expect(initial.attributes('aria-hidden')).toBeUndefined()
    })
  })
})
