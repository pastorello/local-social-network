import { afterEach, describe, it, expect } from 'vitest'

import { setLocale } from '@/lib/i18n'
import { archiveLine } from '../archiveLine'

// Review PR-18: one line for the whole archive, never one per card.
describe('archiveLine', () => {
  it('counts the cards and dates the latest change', () => {
    expect(archiveLine({ published: 127, last_updated: '2026-03-03' })).toBe(
      '127 schede, l’ultima aggiornata il 3 marzo 2026',
    )
  })

  it('says one card in the singular, and does not call it the latest of one', () => {
    expect(archiveLine({ published: 1, last_updated: '2026-10-22' })).toBe(
      '1 scheda, aggiornata il 22 ottobre 2026',
    )
  })

  // «0 schede» is an apology, not a sign of life.
  it('says nothing while the archive is empty', () => {
    expect(archiveLine({ published: 0, last_updated: null })).toBeNull()
  })

  it('says nothing when there was no answer to read', () => {
    expect(archiveLine(null)).toBeNull()
    expect(archiveLine(undefined)).toBeNull()
    // What an unexpected body looks like through a test double, or a proxy.
    expect(archiveLine([] as never)).toBeNull()
  })

  // The API decides the day in Gaeta; the SPA prints it as a calendar day,
  // which no time zone may move to the day before (the 1 January case is the
  // one a UTC midnight read in the Americas would turn into 31 December).
  it('prints the day it was given, whatever the time zone', () => {
    expect(archiveLine({ published: 2, last_updated: '2026-01-01' })).toBe(
      '2 schede, l’ultima aggiornata il 1 gennaio 2026',
    )
  })

  it('still counts the cards if the day is missing', () => {
    expect(archiveLine({ published: 3, last_updated: null })).toBe('3 schede')
  })
})

// In the reader's language (review PR-19a): the same line, the same rule.
describe('archiveLine, in English', () => {
  afterEach(() => setLocale('it'))

  it('counts the entries and dates the latest change', async () => {
    await setLocale('en')

    expect(archiveLine({ published: 127, last_updated: '2026-03-03' })).toBe(
      '127 entries, the latest updated on 3 March 2026',
    )
    expect(archiveLine({ published: 1, last_updated: '2026-10-22' })).toBe(
      '1 entry, updated on 22 October 2026',
    )
    expect(archiveLine({ published: 0, last_updated: null })).toBeNull()
  })
})
