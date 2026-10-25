import { defineMessages } from '..'

// A type's list (review PR-19a): how it counts its rows, its chips and its
// filter's name, its note, its empty state, the next page. With the list's
// own page, so out of the first paint; a type's config says which of these it
// uses (definitions/typeConfigs.ts, handed `lists()`). A collaborator's «Le
// mie» and «Nuova scheda» stay Italian.
const lists = defineMessages({
  it: {
    entries: (count: number) => (count === 1 ? '1 scheda' : `${count} schede`),
    tours: (count: number) => (count === 1 ? '1 itinerario' : `${count} itinerari`),
    // A tour's line in its list: «Mezza giornata · 5 tappe».
    stops: (count: number) => (count === 1 ? '1 tappa' : `${count} tappe`),
    places: (count: number) => (count === 1 ? '1 luogo' : `${count} luoghi`),
    // The filters' accessible names, and the chip that leads to the churches
    // from /luoghi.
    filter: {
      luoghi: 'Filtra luoghi per genere',
      attivita: 'Filtra attività per tipo',
      itinerari: 'Filtra itinerari per intento',
    },
    churches: 'Chiese',
    // The businesses' list says how it is made (cosa-fare.md CF40, D10).
    businessesNote:
      'In ordine alfabetico. Ci sono perché la redazione le ritiene degne di nota: nessuna paga per esserci.',
    all: 'Tutti',
    empty: 'Ancora nessuna scheda.',
    emptyFeste: 'Ancora nessuna festa.',
    loadMore: 'Carica altre',
    draft: 'bozza',
  },
  en: {
    entries: (count: number) => (count === 1 ? '1 entry' : `${count} entries`),
    tours: (count: number) => (count === 1 ? '1 tour' : `${count} tours`),
    stops: (count: number) => (count === 1 ? '1 stop' : `${count} stops`),
    places: (count: number) => (count === 1 ? '1 place' : `${count} places`),
    filter: {
      luoghi: 'Filter places by kind',
      attivita: 'Filter businesses by kind',
      itinerari: 'Filter tours by interest',
    },
    churches: 'Churches',
    businessesNote:
      'In alphabetical order. They are here because the editors think them worth knowing: none of them pays to be listed.',
    all: 'All',
    empty: 'No entries yet.',
    emptyFeste: 'No feasts yet.',
    loadMore: 'Load more',
    draft: 'draft',
  },
})

export type ListWords = ReturnType<typeof lists>

export default lists
