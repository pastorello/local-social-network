import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import CardImagesField from '../CardImagesField.vue'
import type { CardImageEntry } from '@/lib/cardImages'

const entries = (): CardImageEntry[] => [
  { kind: 'existing', id: 1, url: '/media/facciata.jpg' },
  { kind: 'existing', id: 2, url: '/media/interno.jpg' },
  { kind: 'existing', id: 3, url: '/media/dettaglio.jpg' },
]

const mountField = (initial = entries(), removed: (string | number)[] = []) =>
  mount(CardImagesField, {
    props: {
      fieldId: 'type-form-images',
      entries: initial,
      'onUpdate:entries': (value: CardImageEntry[]) => initial.splice(0, initial.length, ...value),
      removedIds: removed,
    },
  })

const ids = (list: CardImageEntry[]) => list.map((e) => (e.kind === 'existing' ? e.id : 'new'))

describe('CardImagesField', () => {
  it('says which image is the cover, rather than leaving it implied', () => {
    const wrapper = mountField()
    const items = wrapper.findAll('li')

    expect(items[0]?.text()).toContain('Copertina')
    expect(items[1]?.text()).not.toContain('Copertina')
  })

  it('moves an image to the front, which is what makes it the cover (D5)', async () => {
    const initial = entries()
    const wrapper = mountField(initial)

    // The second image's "back" button — its label says what it will do.
    const back = wrapper.findAll('li')[1]!.findAll('button')[1]!
    expect(back.attributes('aria-label')).toContain('copertina')
    await back.trigger('click')

    expect(ids(initial)).toEqual([2, 1, 3])
  })

  it('cannot move the first image back or the last one forward', () => {
    const wrapper = mountField()
    const items = wrapper.findAll('li')

    expect(items[0]!.findAll('button')[1]!.attributes('disabled')).toBeDefined()
    expect(items[2]!.findAll('button')[2]!.attributes('disabled')).toBeDefined()
  })

  it('remembers which stored image was removed, so the API can delete it', async () => {
    const initial = entries()
    const removed: (string | number)[] = []
    const wrapper = mountField(initial, removed)

    await wrapper.findAll('li')[0]!.findAll('button')[0]!.trigger('click')

    expect(removed).toEqual([1])
    expect(ids(initial)).toEqual([2, 3])
  })
})
