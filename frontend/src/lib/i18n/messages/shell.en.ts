import type { ShellWords } from './shell'

// The English of shell.ts (review PR-19a), written by hand against its Italian,
// which types it: a key missing here, or one the Italian does not have, does
// not compile. Apart from the Italian because it is loaded only for an English
// reader (lib/i18n/index.ts::loadEnglish), out of the first paint's bytes.
export default {
  skipLink: 'Skip to content',
  nav: {
    label: 'Main',
    map: 'Map',
    explore: 'Explore',
    tours: 'Tours',
    whatToDo: 'What to do',
    project: 'About',
    signIn: 'Sign in',
    menu: 'Menu',
  },
  language: 'Language',
  home: 'Vivere Gaeta — back to the map',
  entriesHeard: (count: number) => (count === 1 ? ' entry' : ' entries'),
  panel: {
    trail: 'Path',
    close: 'Close and return to the map',
    closeTitle: 'Close (Esc)',
    expandMap: 'Enlarge the map',
    backToCard: 'Back to the entry',
  },
  up: {
    tour: 'Tour',
    whatToDo: 'What to do',
    reports: 'Reports',
    events: 'Events',
    event: 'Event',
  },
  title: {
    home: 'Vivere Gaeta — the map of Gaeta',
    project: 'About',
    welcome: 'What do you feel like doing?',
    whatToDo: 'What to do',
    events: 'The events we know of',
    event: 'Events',
  },
  listOfPlaces: (count: number) => `List · ${count === 1 ? '1 place' : `${count} places`}`,
  pollsSignIn: 'Polls are for the people who write the archive',
} satisfies ShellWords
