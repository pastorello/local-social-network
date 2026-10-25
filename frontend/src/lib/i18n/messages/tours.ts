import { defineMessages } from '..'

// A tour (spec itinerari.md) and its guided mode, one stop at a time (I7), in
// the reader's language (review PR-19a) — and what it offers after the last
// stop (review PR-7, lib/tours.ts::afterTour). Its stops' names and notes are
// the archive's Italian.
export default defineMessages({
  it: {
    notFound: 'Itinerario non trovato',
    stopOf: (step: number, total: number) => `Tappa ${step} di ${total}`,
    readCard: 'Leggi la scheda',
    finished: 'Hai finito il giro',
    stopsNav: 'Tappe del tour',
    next: 'Tappa successiva',
    previous: 'Precedente',
    backToTour: 'Torna all’itinerario',
    duration: 'Durata indicativa',
    forWho: 'Per chi vuole',
    start: 'Inizia il tour',
    stops: 'Le tappe',
    places: 'I luoghi',
    // How the list is ordered, and where the map is: beside it or above it.
    order: {
      percorso: (beside: boolean) =>
        `Nell’ordine del giro, numerate sulla mappa ${beside ? 'qui accanto' : 'qui sopra'}.`,
      raccolta: (beside: boolean) =>
        `In ordine di consiglio, numerati sulla mappa ${beside ? 'qui accanto' : 'qui sopra'}.`,
    },
    // «Portami», and to a screen reader where and that it leaves the site.
    takeMe: 'Portami',
    takeMeTo: (where: string) => ` a ${where} (apre Google Maps)`,
    opensMapsHeard: ' (apre Google Maps)',
    after: {
      anotherTour: 'Un altro itinerario',
      allTours: 'Tutti gli itinerari',
      around: 'Cosa c’è qui intorno',
      eat: 'Da mangiare',
      recipes: 'Le ricette di Gaeta',
    },
  },
  en: {
    notFound: 'Tour not found',
    stopOf: (step: number, total: number) => `Stop ${step} of ${total}`,
    readCard: 'Read the entry',
    finished: 'You have finished the tour',
    stopsNav: 'The tour’s stops',
    next: 'Next stop',
    previous: 'Previous',
    backToTour: 'Back to the tour',
    duration: 'Approximate duration',
    forWho: 'Good for',
    start: 'Start the tour',
    stops: 'The stops',
    places: 'The places',
    order: {
      percorso: (beside: boolean) =>
        `In the order of the walk, numbered on the map ${beside ? 'beside this page' : 'above'}.`,
      raccolta: (beside: boolean) =>
        `In the order we suggest them, numbered on the map ${beside ? 'beside this page' : 'above'}.`,
    },
    takeMe: 'Take me',
    takeMeTo: (where: string) => ` to ${where} (opens Google Maps)`,
    opensMapsHeard: ' (opens Google Maps)',
    after: {
      anotherTour: 'Another tour',
      allTours: 'All the tours',
      around: 'What is around here',
      eat: 'Something to eat',
      recipes: 'The recipes of Gaeta',
    },
  },
})
