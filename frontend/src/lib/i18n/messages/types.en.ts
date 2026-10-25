import type { TypesWords } from './types'

// The English of types.ts (review PR-19a), written by hand against its Italian,
// which types it: a key missing here, or one the Italian does not have, does
// not compile. Apart from the Italian because it is loaded only for an English
// reader (lib/i18n/index.ts::loadEnglish), out of the first paint's bytes.
export default {
  byType: {
    feste: { label: 'Feasts', one: 'Feast', layer: 'Feasts' },
    chiese: { label: 'Churches', one: 'Church', layer: 'Churches' },
    ricette: { label: 'Recipes', one: 'Recipe', layer: 'Recipes (where to buy them)' },
    personaggi: {
      label: 'Historical figures',
      one: 'Historical figure',
      layer: 'Historical figures',
    },
    dialetto: { label: 'Dialect', one: 'Word', layer: 'Dialect' },
    libri: { label: 'Recommended books', one: 'Book', layer: 'Books' },
    luoghi: { label: 'Places', one: 'Place', layer: 'Places' },
    // «Eat, drink & shop», the author's name for them in English (decided
    // on 2026-10-25, review PR-19b) — the menu, the panel's eyebrow, the
    // window's title, *About* and the map's layer; one of them is a business.
    attivita: { label: 'Eat, drink & shop', one: 'Business', layer: 'Eat, drink & shop' },
    itinerari: { label: 'Tours', one: 'Tour', layer: 'Tours' },
  },
  kinds: { beve: 'Where to drink', mangia: 'Where to eat', compra: 'Where to buy' },
  otherIntent: 'More to see',
  elsewhere: 'Elsewhere in Gaeta',
  entry: 'Entry',
} satisfies TypesWords
