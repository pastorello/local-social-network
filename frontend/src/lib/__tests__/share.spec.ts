import { describe, it, expect, vi } from 'vitest'

import { shareLink } from '../share'

const data = {
  title: 'Santissima Annunziata · Chiese · Vivere Gaeta',
  url: 'https://viveregaeta.it/chiese/c1',
}

// A browser as the test needs it: a share sheet or none, a clipboard that
// takes the link or refuses it.
const browser = ({
  share,
  canShare,
  writeText = vi.fn().mockResolvedValue(undefined),
  clipboard = true,
}: {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
  writeText?: (text: string) => Promise<void>
  clipboard?: boolean
} = {}) =>
  ({
    share,
    canShare,
    clipboard: clipboard ? { writeText } : undefined,
  }) as unknown as Navigator

// Review PR-16 (P-11): the system's sheet where there is one, the clipboard
// where there is not, and nothing of anybody else's in between.
describe('shareLink', () => {
  it('opens the system’s sheet with the title and the address, where there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn()

    expect(await shareLink(data, browser({ share, writeText }))).toBe('shared')
    expect(share).toHaveBeenCalledWith(data)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('copies the address where there is no sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)

    expect(await shareLink(data, browser({ writeText }))).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://viveregaeta.it/chiese/c1')
  })

  it('takes a closed sheet for an answer: nothing copied, nothing to say', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Share canceled', 'AbortError'))
    const writeText = vi.fn()

    expect(await shareLink(data, browser({ share, writeText }))).toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('copies the address when the sheet would not open', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError'))
    const writeText = vi.fn().mockResolvedValue(undefined)

    expect(await shareLink(data, browser({ share, writeText }))).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(data.url)
  })

  it('copies the address when the browser says it cannot share it', async () => {
    const share = vi.fn()
    const writeText = vi.fn().mockResolvedValue(undefined)

    expect(await shareLink(data, browser({ share, canShare: () => false, writeText }))).toBe(
      'copied',
    )
    expect(share).not.toHaveBeenCalled()
  })

  it('fails, rather than throwing, when the clipboard is refused', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))

    expect(await shareLink(data, browser({ writeText }))).toBe('failed')
  })

  // An http address is not a secure context: the browser gives the page no
  // clipboard at all.
  it('fails when there is no clipboard at all', async () => {
    expect(await shareLink(data, browser({ clipboard: false }))).toBe('failed')
  })
})
