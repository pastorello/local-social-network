import { defineMessages } from '..'

// «Gli eventi che conosciamo» and an event's page (spec cosa-fare.md Part −1
// D9, review PR-27b) in the reader's language (review PR-19a). CF33's
// honesty travels with the words: «the events we know of», never «events in
// Gaeta»; a cancelled one is said first, in words; the archive is a source at
// second hand, and says so. The date itself is lib/when.ts's, with its
// weekday (CF34). Filing and editing an event stay Italian.
export default defineMessages({
  it: {
    title: 'Gli eventi che conosciamo',
    lead: 'In ordine di data e ora. Ci sono quelli che qualcuno ci ha segnalato, non tutto quello che succede a Gaeta.',
    windows: { label: 'Quando', all: 'Tutti', oggi: 'Oggi', settimana: 'Questa settimana' },
    windowNote:
      'Qui non compaiono gli eventi annullati: in «Tutti» restano, barrati, fino al loro giorno.',
    failed: 'Non è stato possibile caricare gli eventi. Riprova tra poco.',
    // CF33: zero is a legitimate state, and it is one true sentence.
    empty: {
      oggi: 'Per oggi non ne conosciamo.',
      settimana: 'Per questa settimana non ne conosciamo.',
      all: 'Per ora non ne conosciamo.',
    },
    fullCalendar:
      'Il calendario completo è quello del Comune di Gaeta e delle associazioni che organizzano.',
    cancelled: 'Annullato',
    postponed: 'Rinviato',
    feast: 'Festa',
    loadMore: 'Carica altri',
    // CF42: the first reason a Gaetano would ever open the request form.
    tellUs: 'Sai di qualcosa che qui non c’è?',
    writeUs: 'Scrivici',
    notFound: 'Evento non trovato',
    // An event's page.
    cancelledBanner: 'Annullato: questo evento non si tiene.',
    postponedBanner: 'Rinviato: non si tiene in questa data, e la nuova non la conosciamo ancora.',
    draft: 'Bozza',
    past: 'È già passato: resta qui, nell’archivio.',
    where: 'Dove',
    inBrief: 'In breve',
    programme: 'Programma e conferme',
    otherSite: ' (apre un altro sito)',
    secondHand:
      'Gli eventi li riportiamo come li abbiamo saputi, da una locandina o da chi li organizza: prima di andare, una conferma da loro vale più della nostra.',
    // The poster, which a reader can enlarge to read (PosterViewer).
    poster: {
      enlarge: 'Ingrandisci la locandina',
      enlargeOf: (title: string) => `Ingrandisci la locandina di ${title}`,
      of: (title: string) => `La locandina di ${title}`,
      actualSize: 'Dimensione reale',
      actualSizeRegion: 'La locandina a dimensione reale',
      close: 'Chiudi',
      closeTitle: 'Chiudi (Esc)',
    },
  },
  en: {
    title: 'The events we know of',
    lead: 'In order of date and time. These are the ones someone has told us about, not everything that happens in Gaeta.',
    windows: { label: 'When', all: 'All', oggi: 'Today', settimana: 'This week' },
    windowNote:
      'Cancelled events do not appear here: under “All” they stay, struck through, until their day.',
    failed: 'The events could not be loaded. Try again in a little while.',
    empty: {
      oggi: 'We know of none today.',
      settimana: 'We know of none this week.',
      all: 'We know of none for now.',
    },
    fullCalendar:
      'The complete calendar is the one kept by the Comune di Gaeta and by the associations that organise them.',
    cancelled: 'Cancelled',
    postponed: 'Postponed',
    feast: 'Feast',
    loadMore: 'Load more',
    tellUs: 'Know of something that is not here?',
    writeUs: 'Write to us',
    notFound: 'Event not found',
    cancelledBanner: 'Cancelled: this event will not take place.',
    postponedBanner:
      'Postponed: it will not take place on this date, and we do not know the new one yet.',
    draft: 'Draft',
    past: 'It has already taken place: it stays here, in the archive.',
    where: 'Where',
    inBrief: 'In brief',
    programme: 'Programme and confirmations',
    otherSite: ' (opens another site)',
    secondHand:
      'We report events as we heard of them, from a poster or from the people organising them: before you go, a confirmation from them is worth more than ours.',
    poster: {
      enlarge: 'Enlarge the poster',
      enlargeOf: (title: string) => `Enlarge the poster for ${title}`,
      of: (title: string) => `The poster for ${title}`,
      actualSize: 'Actual size',
      actualSizeRegion: 'The poster at actual size',
      close: 'Close',
      closeTitle: 'Close (Esc)',
    },
  },
})
