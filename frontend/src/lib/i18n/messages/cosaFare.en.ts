import type { CosaFareWords } from './cosaFare'

// The English of cosaFare.ts (review PR-19a), written by hand against its Italian,
// which types it: a key missing here, or one the Italian does not have, does
// not compile. Apart from the Italian because it is loaded only for an English
// reader (lib/i18n/index.ts::loadEnglish), out of the first paint's bytes.
export default {
  eyebrow: 'In Gaeta',
  title: 'What there is to do here',
  lead: {
    wide: 'Choose an area: you will find the places to see, the tours that pass through it and the feasts that cross it.',
    phone: 'Places, tours and feasts, area by area.',
  },
  zones: 'Areas',
  indicative: 'Indicative areas, not official boundaries.',
  changeZone: 'Change area',
  failed: 'Part of the archive did not load: what you see may be incomplete.',
  intentEmpty: (intent: string) => `The archive has nothing here for “${intent}” yet.`,
  emptyHere: 'The archive has nothing in this area yet.',
  try: 'Try',
  or: 'or',
  anywhere: 'anywhere in Gaeta',
  alphabetical: 'in alphabetical order',
  draft: 'draft',
  chooseZone: 'Choose an area to see what is there.',
  note: 'This is what the archive holds, not everything that happens in Gaeta. Opening hours, when we know them, are on each place’s entry, with the date we were told them.',
  blocks: {
    toursHere: 'Tours that pass through here',
    tours: 'Tours',
    otherToursHere: 'Other tours that pass through here',
    festeHere: 'The feasts of this area',
    dishes: 'Recipes do not belong to one area: these are for the whole of Gaeta.',
  },
  where: {
    label: 'Where are you?',
    hint: 'The name of the place you are in, as Gaeta calls it: il castello, Serapo, Piazza XIX Maggio…',
    zone: 'area',
    unknown: 'We don’t know this place: choose an area below.',
    one: '1 place: Enter to choose it.',
    many: (count: number) =>
      `${count} places: the arrow keys to go through them, Enter to choose one.`,
    none: 'No place by this name.',
    // The name as Gaeta writes it, article and all: «Il castello is in
    // Gaeta Medievale» reads; «You are at il castello» would not.
    chosenZone: (zone: string) => `Here is what there is in ${zone}.`,
    chosenPlace: (name: string, _at: string, zone: string) =>
      `${name} is in ${zone}: here is what there is.`,
  },
} satisfies CosaFareWords
