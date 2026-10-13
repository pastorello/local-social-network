import { describe, it, expect } from 'vitest'

import { OTHER_INTENT, byTitle, intentOf } from '../intents'

describe('intents (spec cosa-fare.md Part −1, D4)', () => {
  it('files places under the activities of /benvenuto', () => {
    expect(intentOf({ type: 'luoghi', genre: 'spiaggia' })).toBe('mare')
    expect(intentOf({ type: 'luoghi', genre: 'castello' })).toBe('citta')
    expect(intentOf({ type: 'luoghi', genre: 'punto-panoramico' })).toBe('camminare')
    expect(intentOf({ type: 'chiese', genre: null })).toBe('citta')
  })

  it('shows a genre nobody has mapped yet instead of losing it', () => {
    expect(intentOf({ type: 'luoghi', genre: 'grotta' })).toBe(OTHER_INTENT)
    expect(intentOf({ type: 'luoghi', genre: null })).toBe(OTHER_INTENT)
  })

  it('sorts as an Italian reader expects, accents and capitals aside', () => {
    const titles = ['torre', 'Ariana', 'Égalité', 'arenauta'].map((title) => ({ title }))
    expect(titles.sort(byTitle).map((t) => t.title)).toEqual([
      'arenauta',
      'Ariana',
      'Égalité',
      'torre',
    ])
  })
})
