import { defineEntryMessages, type Widen } from '..'

// The shell's words (review PR-19a): the menu, the panel every page opens in,
// the way back to the map, and the window's title — on every route, so in the
// entry chunk. The account's own menu behind the avatar stays Italian, with
// the collaborator's surfaces.
const it = {
  skipLink: 'Salta al contenuto',
  nav: {
    label: 'Principale',
    map: 'Mappa',
    explore: 'Esplora',
    traditions: 'Tradizioni',
    whatToDo: 'Cosa fare',
    project: 'Il progetto',
    signIn: 'Accedi',
    menu: 'Menu',
  },
  // The switch's group: what it is. Each language is named in itself.
  language: 'Lingua',
  // The wordmark's link (review PR-8, A-01).
  home: 'Vivere Gaeta — pagina iniziale',
  // The Esplora menu's count, heard after the type: «Luoghi, 9 schede».
  entriesHeard: (count: number) => (count === 1 ? ' scheda' : ' schede'),
  panel: {
    trail: 'Percorso',
    close: 'Chiudi e torna alla mappa',
    closeTitle: 'Chiudi (Esc)',
    expandMap: 'Allarga la mappa',
    backToCard: 'Torna alla scheda',
  },
  // *Up*, named after where it leads (lib/navigation.ts).
  up: {
    tour: 'Itinerario',
    whatToDo: 'Cosa fare',
    reports: 'Segnalazioni',
    events: 'Eventi',
    event: 'Evento',
  },
  // The window's title (lib/pageTitle.ts).
  title: {
    home: 'Vivere Gaeta — la mappa di Gaeta',
    project: 'Il progetto',
    map: 'Mappa',
    whatToDo: 'Cosa fare',
    events: 'Gli eventi che conosciamo',
    event: 'Eventi',
  },
  // The enlarged map's way back to the places (MapStage).
  listOfPlaces: (count: number) => `Elenco · ${count === 1 ? '1 luogo' : `${count} luoghi`}`,
  // A reader who followed a link to the polls, over the login (review PR-17).
  pollsSignIn: "I sondaggi sono per chi collabora all'archivio",
}

export type ShellWords = Widen<typeof it>

export default defineEntryMessages('shell', it)
