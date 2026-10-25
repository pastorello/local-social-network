import { defineMessages } from '..'

// A card's page around its text (review PR-19a): the headings a reader meets
// on a church, a feast, a place — «Dove si trova», «Se la trovi chiusa» — the
// way there, sharing, and the way back to its list. The card's own words are
// its author's, in its language; T7 keeps its Italian name the heading.
export default defineMessages({
  it: {
    draft: 'Bozza',
    images: 'Immagini',
    backTo: (list: string) => `← Torna a ${list}`,
    // The list «Torna a…» names, by the type's key.
    back: {
      feste: 'le feste',
      chiese: 'chiese',
      ricette: 'ricette',
      personaggi: 'personaggi storici',
      dialetto: 'dialetto',
      libri: 'libri consigliati',
      luoghi: 'luoghi',
      attivita: 'attività',
      itinerari: 'itinerari',
    },
    // A card's facts, by field key, as TypeDetailView prints them.
    fields: {
      ingredients: 'Ingredienti',
      servings: 'Dosi',
      procedure: 'Procedimento',
      life_dates: 'Date',
      meaning: 'Significato',
      example_usage: 'Esempio d’uso',
      book_author: 'Autore del libro',
      year: 'Anno',
      publisher: 'Editore',
      genre: 'Genere',
      kind: 'Tipo',
      how_to_get_there: 'Come arrivarci',
      duration: 'Durata indicativa',
    },
    // What is known about getting in (ADR-0008, VisitInfo): «Visitare» for a
    // church or a monument, «Orari» for a business, whose door is only its
    // hours (ADR-0010). Never a word that says a place is open.
    visit: {
      heading: 'Visitare',
      hours: 'Orari',
      reported: (day: string) => `Orari segnalati il ${day} — telefona per sicurezza.`,
      callAhead: 'Telefona per sicurezza.',
      keeper: 'Chi ha le chiavi:',
    },
    notFound: 'Scheda non trovata',
    festaNotFound: 'Festa non trovata',
    // «Dove» over the text (review PR-24) and «Dove si trova» after it
    // (review PR-3).
    where: 'Dove',
    whereIs: 'Dove si trova',
    fromOutside: 'Se la trovi chiusa',
    directions: 'Come arrivarci',
    // It leaves the site, and says so in words the reader sees (PR-3).
    opensMaps: '(apre Google Maps)',
    point: (number: number) => `Punto ${number}`,
    // Where the map is, for this page: beside it, or above it on a phone.
    highlighted: (beside: boolean) =>
      `È evidenziato sulla mappa, ${beside ? 'qui accanto' : 'qui sopra'}.`,
    // «Condividi» (review PR-16).
    share: 'Condividi',
    shareStop: ' la tappa',
    copied: 'Link copiato',
    copyFailed: 'Non è stato possibile copiare il link: copialo dalla barra degli indirizzi.',
    // The card's other languages, by name, in the reader's (C4's switch).
    otherLanguages: 'Cambia lingua',
    languages: { it: 'Italiano', en: 'Inglese' },
    // A feast (review PR-27).
    festa: {
      when: 'Quando',
      programme: 'Programma',
      route: 'Il percorso',
      toStart: 'Portami alla partenza',
      unnamedStop: 'Tappa senza nome',
      notConfirmed: 'data non ancora confermata',
      usually: 'Di solito:',
    },
  },
  en: {
    draft: 'Draft',
    images: 'Images',
    backTo: (list: string) => `← Back to ${list}`,
    back: {
      feste: 'feasts',
      chiese: 'churches',
      ricette: 'recipes',
      personaggi: 'historical figures',
      dialetto: 'dialect',
      libri: 'recommended books',
      luoghi: 'places',
      attivita: 'businesses',
      itinerari: 'tours',
    },
    fields: {
      ingredients: 'Ingredients',
      servings: 'Serves',
      procedure: 'Method',
      life_dates: 'Dates',
      meaning: 'Meaning',
      example_usage: 'In use',
      book_author: 'Author',
      year: 'Year',
      publisher: 'Publisher',
      genre: 'Kind',
      kind: 'Kind',
      how_to_get_there: 'Getting there',
      duration: 'Approximate duration',
    },
    visit: {
      heading: 'Visiting',
      hours: 'Opening hours',
      reported: (day: string) => `Hours reported on ${day} — call ahead to be sure.`,
      callAhead: 'Call ahead to be sure.',
      keeper: 'Who has the keys:',
    },
    notFound: 'Entry not found',
    festaNotFound: 'Feast not found',
    where: 'Where',
    whereIs: 'Where it is',
    fromOutside: 'If you find it closed',
    directions: 'Getting there',
    opensMaps: '(opens Google Maps)',
    point: (number: number) => `Point ${number}`,
    highlighted: (beside: boolean) =>
      `It is highlighted on the map, ${beside ? 'beside this page' : 'just above'}.`,
    share: 'Share',
    shareStop: ' this stop',
    copied: 'Link copied',
    copyFailed: 'The link could not be copied: copy it from the address bar.',
    otherLanguages: 'Change language',
    languages: { it: 'Italian', en: 'English' },
    festa: {
      when: 'When',
      programme: 'Programme',
      route: 'The route',
      toStart: 'Take me to the start',
      unnamedStop: 'Unnamed stop',
      notConfirmed: 'date not confirmed yet',
      usually: 'Usually:',
    },
  },
})
