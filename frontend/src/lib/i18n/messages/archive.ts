import { defineEntryMessages, type Widen } from '..'

// The archive's line (content.md, review PR-18) in the reader's language
// (review PR-19a): «22 schede, l’ultima aggiornata il 24 ottobre 2026». On the
// home, so in the first paint; the day itself is lib/availability.ts's
// formatDay, in the reader's locale.
const it = {
  entries: (count: number) => (count === 1 ? '1 scheda' : `${count} schede`),
  one: (day: string) => `1 scheda, aggiornata il ${day}`,
  many: (count: number, day: string) => `${count} schede, l’ultima aggiornata il ${day}`,
}

export type ArchiveWords = Widen<typeof it>

export default defineEntryMessages('archive', it)
