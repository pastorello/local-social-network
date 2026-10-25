import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import router from '@/router'
import { composeTitle, homeTitle, setTitle, titleParts } from '../pageTitle'

// The window's title (review PR-23, N-04): the tab, the history and a shared
// link say which page it is, most specific first.
describe('composeTitle', () => {
  it('reads «Titolo · Sezione · Vivere Gaeta»', () => {
    expect(composeTitle(['Santissima Annunziata', 'Chiese'])).toBe(
      'Santissima Annunziata · Chiese · Vivere Gaeta',
    )
    expect(composeTitle(['Itinerari'])).toBe('Itinerari · Vivere Gaeta')
  })

  it('is the home’s own title with nothing to name', () => {
    expect(composeTitle([])).toBe('Vivere Gaeta — la mappa di Gaeta')
    expect(homeTitle()).toBe('Vivere Gaeta — la mappa di Gaeta')
  })

  it('leaves out a part that is empty, rather than printing « ·  · »', () => {
    expect(composeTitle(['', 'Chiese'])).toBe('Chiese · Vivere Gaeta')
    expect(composeTitle(['  '])).toBe(homeTitle())
  })

  it('is what setTitle writes on the document', () => {
    setTitle(['Il progetto'])
    expect(document.title).toBe('Il progetto · Vivere Gaeta')
  })
})

describe('the router’s titles', () => {
  it('names every page but the home, which has a title of its own', () => {
    const untitled = router
      .getRoutes()
      .filter((record) => !titleParts(record.meta.title).length)
      .map((record) => record.path)

    expect(untitled).toEqual(['/'])
  })

  it('sets the route’s title after every navigation', async () => {
    setActivePinia(createPinia())

    await router.push('/itinerari')
    expect(document.title).toBe('Itinerari · Vivere Gaeta')

    await router.push('/cosa-fare?zona=serapo')
    expect(document.title).toBe('Cosa fare · Vivere Gaeta')

    await router.push('/')
    expect(document.title).toBe(homeTitle())
  })
})
