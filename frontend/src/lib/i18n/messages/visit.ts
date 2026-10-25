import { defineEntryMessages, type Widen } from '..'

// What is known about getting in (ADR-0008), in the reader's language (review
// PR-19a). Read the ADR before changing a word: nothing here ever says a place
// is open, and hours are never shown without the day someone reported them.
// Its own file, the states alone, because «Cosa si può fare qui», in the
// first paint, prints them on its rows; the rest of what VisitInfo says is
// card.ts's, with the card's page.
const it = {
  states: {
    services: 'Si entra solo durante le funzioni.',
    on_request: 'Si visita su richiesta: chiedi a chi ha le chiavi.',
    works: 'Chiuso per lavori.',
    no_door: "All'aperto: non c'è una porta da trovare chiusa.",
  },
}

export type VisitWords = Widen<typeof it>

export default defineEntryMessages('visit', it)
