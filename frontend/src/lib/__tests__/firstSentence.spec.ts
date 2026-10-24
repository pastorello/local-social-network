import { describe, it, expect } from 'vitest'

import { firstSentence } from '../firstSentence'

// Review PR-24: «Dove» has room for one sentence of how to get there.
describe('firstSentence', () => {
  it('keeps the first sentence and leaves the rest', () => {
    expect(
      firstSentence('A piedi dal centro, dieci minuti. In auto, parcheggio sulla Flacca.'),
    ).toBe('A piedi dal centro, dieci minuti.')
    expect(firstSentence('Si sale a piedi? Sì, dalla scalinata.')).toBe('Si sale a piedi?')
  })

  it('takes a line the author broke as the end of one', () => {
    expect(firstSentence('A piedi dal centro\nIn auto, parcheggio sulla Flacca')).toBe(
      'A piedi dal centro',
    )
  })

  it('returns a text of one sentence whole, its full stop included', () => {
    expect(firstSentence('  Dal porto, lungo il mare.  ')).toBe('Dal porto, lungo il mare.')
    expect(firstSentence('In barca')).toBe('In barca')
  })

  it('does not end a sentence at an abbreviation or before a number', () => {
    expect(firstSentence('Si sale per Via S. Maria, poi a destra. Dieci minuti.')).toBe(
      'Si sale per Via S. Maria, poi a destra.',
    )
    expect(firstSentence('Con il bus n. 3 dalla stazione. Ogni mezz’ora.')).toBe(
      'Con il bus n. 3 dalla stazione.',
    )
    expect(firstSentence('Sulla S.S. Flacca verso Sperlonga. Poi a piedi.')).toBe(
      'Sulla S.S. Flacca verso Sperlonga.',
    )
    expect(firstSentence('A piedi, ca. 10 minuti dal porto. Poi la scalinata.')).toBe(
      'A piedi, ca. 10 minuti dal porto.',
    )
  })

  it('is empty for an empty text', () => {
    expect(firstSentence('')).toBe('')
    expect(firstSentence('   \n  ')).toBe('')
  })
})
