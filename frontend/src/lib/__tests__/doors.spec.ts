import { describe, it, expect } from 'vitest'

import { previewNames } from '../doors'

describe('doors', () => {
  it('names what is behind a door, the first two, and says when there are more', () => {
    expect(previewNames(['Serapo'])).toBe('Serapo')
    expect(previewNames(['Serapo', 'Porto Salvo'])).toBe('Serapo · Porto Salvo')
    expect(previewNames(['Serapo', 'Porto Salvo', 'Monte Orlando'])).toBe('Serapo · Porto Salvo…')
  })
})
