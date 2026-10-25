import type { VisitWords } from './visit'

// The English of visit.ts (review PR-19a), written by hand against its Italian,
// which types it: a key missing here, or one the Italian does not have, does
// not compile. Apart from the Italian because it is loaded only for an English
// reader (lib/i18n/index.ts::loadEnglish), out of the first paint's bytes.
export default {
  states: {
    services: 'You can get in only during services.',
    on_request: 'Visits on request: ask whoever has the keys.',
    works: 'Closed for works.',
    no_door: 'In the open air: there is no door to find closed.',
  },
} satisfies VisitWords
