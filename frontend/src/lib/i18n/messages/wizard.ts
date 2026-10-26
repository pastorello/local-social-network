import { defineEntryMessages, type Widen } from '..'

// The wizard «Cosa fare adesso» (review PR-21) in the reader's language
// (review PR-19a): /benvenuto's two steps, the home's first, and the lines
// under each answer (lib/wizard.ts). The intents' own names and lines come
// from the API (`name_en`, `description_en`, the author's — review PR-19b).
const it = {
  welcome: 'Benvenuti a Gaeta',
  question: 'Che cosa ti va di fare?',
  none: 'Le proposte sono in preparazione. Intanto, la mappa racconta la città.',
  calendar: 'In calendario',
  goToMap: { title: 'Vai alla mappa', line: 'I livelli e l’elenco dei luoghi' },
  dontKnow: 'Non lo so: fammi vedere la mappa',
  where: 'Dove?',
  everywhere: 'Ovunque a Gaeta',
  // «Hai scelto: Mangiare · Serapo», each answer a link back.
  chosen: 'Hai scelto:',
  change: 'Cambia la scelta: ',
  // What is behind an answer, in a line: «2 luoghi · 1 itinerario».
  count: {
    places: (count: number) => (count === 1 ? '1 luogo' : `${count} luoghi`),
    tours: (count: number) => (count === 1 ? '1 itinerario' : `${count} itinerari`),
    dishes: (count: number) => (count === 1 ? '1 ricetta' : `${count} ricette`),
    events: (count: number) => (count === 1 ? '1 evento' : `${count} eventi`),
  },
  windows: {
    oggi: { name: 'Oggi', description: 'Eventi e feste di oggi' },
    settimana: {
      name: 'Questa settimana',
      description: 'Eventi e feste da oggi ai prossimi sei giorni',
    },
  },
}

export type WizardWords = Widen<typeof it>

export default defineEntryMessages('wizard', it)
