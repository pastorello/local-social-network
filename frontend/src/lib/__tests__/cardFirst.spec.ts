import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import type { RouteLocationNormalized } from 'vue-router'

import { fetchCardFirst } from '../cardFirst'

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
})
