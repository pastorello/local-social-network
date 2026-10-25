import { defineEntryMessages, type Widen } from '..'

export interface TypeWords {
  label: string
  one: string
  layer: string
}

// The card types as a reader names them (review PR-19a): a list's title, one
// of them, and the map's layer — what the menu, the panel's eyebrow, the map
// and «Cosa si può fare qui» say, so in the first paint. Keyed by the type's
// route segment, its key everywhere (lib/mapLayers.ts). What only a list or a
// card's page says — its count, its filter, a card's facts — is in lists.ts
// and card.ts, with those pages. The forms keep definitions/typeConfigs.ts's
// Italian labels: the collaborator's surfaces stay Italian.
const it = {
  byType: {
    feste: { label: 'Feste', one: 'Festa', layer: 'Feste' },
    chiese: { label: 'Chiese', one: 'Chiesa', layer: 'Chiese' },
    ricette: { label: 'Ricette', one: 'Ricetta', layer: 'Ricette (dove si comprano)' },
    personaggi: {
      label: 'Personaggi storici',
      one: 'Personaggio storico',
      layer: 'Personaggi storici',
    },
    dialetto: { label: 'Dialetto', one: 'Termine', layer: 'Dialetto' },
    libri: { label: 'Libri consigliati', one: 'Libro', layer: 'Libri' },
    luoghi: { label: 'Luoghi', one: 'Luogo', layer: 'Luoghi' },
    attivita: { label: 'Attività', one: 'Attività', layer: 'Attività' },
    itinerari: { label: 'Itinerari', one: 'Itinerario', layer: 'Itinerari' },
  },
  // What a business is, under its activity on «Cosa si può fare qui»
  // (attivita.models.KIND_CHOICES).
  kinds: { beve: 'Dove si beve', mangia: 'Dove si mangia', compra: 'Dove si compra' },
  otherIntent: 'Altro da vedere',
  elsewhere: 'Altrove a Gaeta',
  entry: 'Scheda',
}

export type TypesWords = Widen<typeof it>

const types = defineEntryMessages('types', it)

// One type's words, or none for a key the archive does not know (yet).
export const wordsOf = (key: string): TypeWords | undefined =>
  (types().byType as Record<string, TypeWords>)[key]

export default types
