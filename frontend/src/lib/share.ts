// Sharing a page (review PR-16, P-11): the system's own share sheet where the
// browser has one — a phone, where a link goes to WhatsApp — and the clipboard
// where it has not. Both are the browser's: no social buttons, no shortener,
// nothing of anybody else's loaded or called (TD-30, D6b). And both run only
// from the reader's own press, which is what the browser asks before it lets a
// page open the sheet or write to the clipboard.
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

type Sharer = Pick<Navigator, 'clipboard'> & Partial<Pick<Navigator, 'share' | 'canShare'>>

export const shareLink = async (
  data: { title: string; url: string },
  sharer: Sharer = navigator,
): Promise<ShareOutcome> => {
  if (typeof sharer.share === 'function' && (sharer.canShare?.(data) ?? true)) {
    try {
      await sharer.share(data)
      return 'shared'
    } catch (error) {
      // The reader closed the sheet: an answer, not a failure.
      if ((error as Error | null)?.name === 'AbortError') return 'cancelled'
      // Anything else — a page in a frame that may not share, a target that
      // would not start — still has the clipboard.
    }
  }
  // Absent outside a secure context (an http address), and refused where the
  // reader or the browser has not allowed it: either way, said to the reader.
  if (!sharer.clipboard) return 'failed'
  try {
    await sharer.clipboard.writeText(data.url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
