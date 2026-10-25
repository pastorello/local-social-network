import type { ArchiveWords } from './archive'

// The English of archive.ts (review PR-19a), written by hand against its
// Italian, which types it: a key missing here, or one the Italian does not
// have, does not compile. Apart from the Italian because it is loaded only for
// an English reader (lib/i18n/index.ts::loadEnglish), out of the first paint's
// bytes.
export default {
  entries: (count: number) => (count === 1 ? '1 entry' : `${count} entries`),
  one: (day: string) => `1 entry, updated on ${day}`,
  many: (count: number, day: string) => `${count} entries, the latest updated on ${day}`,
} satisfies ArchiveWords
