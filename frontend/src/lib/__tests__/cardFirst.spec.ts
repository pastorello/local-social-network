import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import type { RouteLocationNormalized } from 'vue-router'

import { fetchCardFirst } from '../cardFirst'
import { setLocale } from '@/lib/i18n'

vi.mock('axios')

const going = (id: string) => ({ params: { id }, meta: {} }) as unknown as RouteLocationNormalized

const run = (guard: ReturnType<typeof fetchCardFirst>, to: RouteLocationNormalized) =>
  guard.call(undefined, to, to, () => {})

// Review PR-10 (P-09): the panel is born in the card's shape, so the card is
// in before its page mounts.
describe('fetchCardFirst', () => {
  beforeEach(() => vi.clearAllMocks())

  it('brings the card with the navigation, and lets it through', async () => {
    const card = { id: 'r1', title: 'Tiella', pins: [] }
    vi.mocked(axios.get).mockResolvedValue({ data: card })
    const to = going('r1')

    const outcome = await run(fetchCardFirst('/api/ricette/'), to)

    expect(axios.get).toHaveBeenCalledWith('/api/ricette/r1/')
    expect(to.meta.card).toEqual(card)
    expect(outcome).toBeUndefined()
  })

  it('lets the page through without it when the request fails: the page asks, and says why', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('404'))
    const to = going('missing')

    const outcome = await run(fetchCardFirst('/api/ricette/'), to)

    expect(to.meta.card).toBeUndefined()
    expect(outcome).toBeUndefined()
  })

  // Review PR-19b: for a reader in English the card's English version comes
  // with it, so the page is born in the reader's language too.
  it('brings the English version along for a reader in English, and only a published one', async () => {
    const card = {
      id: 'r1',
      language: 'it',
      translation_of: null,
      translations: [{ id: 'r2', language: 'en', title: 'Tiella', is_published: true }],
    }
    const english = { id: 'r2', language: 'en', translation_of: 'r1', translations: [] }
    vi.mocked(axios.get).mockImplementation(async (url: string) => ({
      data: url === '/api/ricette/r2/' ? english : card,
    }))
    await setLocale('en')
    try {
      const to = going('r1')
      await run(fetchCardFirst('/api/ricette/'), to)
      expect(to.meta.card).toEqual(card)
      expect(to.meta.translation).toEqual(english)

      card.translations[0]!.is_published = false
      const again = going('r1')
      await run(fetchCardFirst('/api/ricette/'), again)
      expect(again.meta.translation).toBeNull()
      expect(axios.get).toHaveBeenCalledTimes(3)
    } finally {
      await setLocale('it')
    }
  })

  it('brings no English for a reader in Italian', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { id: 'r1', language: 'it', translation_of: null, translations: [] },
    })
    const to = going('r1')

    await run(fetchCardFirst('/api/ricette/'), to)

    expect(to.meta.translation).toBeNull()
    expect(axios.get).toHaveBeenCalledTimes(1)
  })
})
