import { describe, it, expect } from 'vitest'

import { appendImages, toEntries, type CardImageEntry } from '../cardImages'

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

describe('appendImages', () => {
  it('sends the files in the order the author arranged, with matching tokens', () => {
    const entries: CardImageEntry[] = [
      { kind: 'new', file: file('terza.jpg'), preview: '' },
      { kind: 'existing', id: 7, url: '/media/vecchia.jpg' },
      { kind: 'new', file: file('prima.jpg'), preview: '' },
    ]
    const formData = new FormData()

    appendImages(formData, entries, [])

    // `new:<n>` counts the files *in this request*, so the n-th token has to
    // name the n-th appended file — that pairing is the whole protocol.
    expect((formData.getAll('images') as File[]).map((f) => f.name)).toEqual([
      'terza.jpg',
      'prima.jpg',
    ])
    expect(JSON.parse(formData.get('image_order') as string)).toEqual(['new:0', '7', 'new:1'])
  })

  it('omits the removal list when nothing was removed', () => {
    const formData = new FormData()

    appendImages(formData, [], [])

    expect(formData.get('remove_image_ids')).toBeNull()
    expect(formData.get('image_order')).toBe('[]')
  })

  it('carries the removed ids when there are some', () => {
    const formData = new FormData()

    appendImages(formData, [], [3, 'abc'])

    expect(JSON.parse(formData.get('remove_image_ids') as string)).toEqual([3, 'abc'])
  })

  it('turns stored images into entries in the order the API gave them', () => {
    const entries = toEntries([
      { id: 1, imageURL: '/media/a.jpg', caption: '' },
      { id: 2, imageURL: '/media/b.jpg', caption: '' },
    ] as never)

    expect(entries).toEqual([
      { kind: 'existing', id: 1, url: '/media/a.jpg' },
      { kind: 'existing', id: 2, url: '/media/b.jpg' },
    ])
  })
})
