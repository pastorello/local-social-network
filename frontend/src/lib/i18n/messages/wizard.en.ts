import type { WizardWords } from './wizard'

// The English of wizard.ts (review PR-19a), written by hand against its Italian,
// which types it: a key missing here, or one the Italian does not have, does
// not compile. Apart from the Italian because it is loaded only for an English
// reader (lib/i18n/index.ts::loadEnglish), out of the first paint's bytes.
export default {
  welcome: 'Welcome to Gaeta',
  question: 'What do you feel like doing?',
  none: 'The suggestions are still being written. In the meantime, the map tells the town’s story.',
  calendar: 'On the calendar',
  goToMap: { title: 'Go to the map', line: 'The layers and the list of places' },
  dontKnow: 'I don’t know: show me the map',
  where: 'Where?',
  everywhere: 'Anywhere in Gaeta',
  chosen: 'You chose:',
  change: 'Change your choice: ',
  count: {
    places: (count: number) => (count === 1 ? '1 place' : `${count} places`),
    tours: (count: number) => (count === 1 ? '1 tour' : `${count} tours`),
    dishes: (count: number) => (count === 1 ? '1 recipe' : `${count} recipes`),
    events: (count: number) => (count === 1 ? '1 event' : `${count} events`),
  },
  windows: {
    oggi: { name: 'Today', description: 'Events and feasts today' },
    settimana: {
      name: 'This week',
      description: 'Events and feasts from today to the next six days',
    },
  },
} satisfies WizardWords
