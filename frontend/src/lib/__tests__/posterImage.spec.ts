import { describe, it, expect } from 'vitest'

import { shrinkPoster } from '../posterImage'

// A poster from a phone is made small enough to send (cosa-fare.md D9); what
// cannot be shrunk here goes as it is, and the server says what is wrong.
describe('shrinkPoster', () => {
  it('sends a file as it is where the browser cannot draw it', async () => {
    const file = new File(['x'], 'locandina.jpg', { type: 'image/jpeg' })

    expect(await shrinkPoster(file)).toBe(file)
  })

  it('leaves alone what is not an image', async () => {
    const file = new File(['%PDF'], 'programma.pdf', { type: 'application/pdf' })

    expect(await shrinkPoster(file)).toBe(file)
  })
})
