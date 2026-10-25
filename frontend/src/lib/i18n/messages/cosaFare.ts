import { defineEntryMessages, type Widen } from '..'

// «Cosa si può fare qui» (spec cosa-fare.md Part −1) and «Dove sei?» in the
// reader's language (review PR-19a). A zone is a part of town to an English
// reader — an «area» — and keeps its Italian name: a proper name is not
// translated. The places' own names in «Dove sei?» are the ones Gaeta uses, so
// the field's hint shows them as they are written.
const it = {
  eyebrow: 'A Gaeta',
  title: 'Cosa si può fare qui',
  lead: {
    wide: 'Scegli una zona: trovi i luoghi da vedere, gli itinerari che ci passano e le feste che la attraversano.',
    phone: 'Luoghi, itinerari e feste, zona per zona.',
  },
  zones: 'Zone',
  indicative: 'Zone indicative, non confini ufficiali.',
  changeZone: 'Cambia zona',
  failed: "Una parte dell'archivio non si è caricata: quello che vedi potrebbe essere incompleto.",
  // The wizard's third step with nothing for the intent here.
  intentEmpty: (intent: string) => `Qui l'archivio non ha ancora niente per «${intent}».`,
  emptyHere: "In questa zona l'archivio non ha ancora niente.",
  try: 'Prova',
  or: 'o',
  anywhere: 'ovunque a Gaeta',
  alphabetical: 'in ordine alfabetico',
  draft: 'bozza',
  chooseZone: "Scegli una zona per vedere cosa c'è.",
  // The page's closing note: what it is, and where the hours are (ADR-0008).
  note: "Questo è quello che c'è in archivio, non tutto quello che succede a Gaeta. Gli orari, quando li conosciamo, sono sulla scheda di ogni luogo, con la data in cui ce li hanno detti.",
  blocks: {
    toursHere: 'Itinerari che passano di qui',
    tours: 'Itinerari',
    otherToursHere: 'Altri itinerari che passano di qui',
    festeHere: 'Le feste di questa zona',
    dishes: 'Le ricette non stanno in una zona sola: queste valgono per tutta Gaeta.',
  },
  // «Dove sei?» (review PR-20).
  where: {
    label: 'Dove sei?',
    hint: 'Il nome del posto in cui ti trovi: il castello, Serapo, Piazza XIX Maggio…',
    zone: 'zona',
    unknown: 'Non conosciamo questo posto: scegli una zona qui sotto.',
    one: '1 posto: Invio per sceglierlo.',
    many: (count: number) => `${count} posti: le frecce per scorrerli, Invio per sceglierne uno.`,
    none: 'Nessun posto con questo nome.',
    // The line once a name is chosen: «Sei al castello: ti mostriamo Gaeta
    // Medievale.» — `at` is the name with its preposition (placeNames.ts).
    chosenZone: (zone: string) => `Ti mostriamo ${zone}.`,
    chosenPlace: (_name: string, at: string, zone: string) => `Sei ${at}: ti mostriamo ${zone}.`,
  },
}

export type CosaFareWords = Widen<typeof it>

export default defineEntryMessages('cosaFare', it)
