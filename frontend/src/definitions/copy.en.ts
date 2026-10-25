import type { CopyWords } from './copy'

// The English of copy.ts (review PR-19a), written by hand against its Italian,
// which types it: a key missing here, or one the Italian does not have, does
// not compile. Apart from the Italian because it is loaded only for an English
// reader (lib/i18n/index.ts::loadEnglish), out of the first paint's bytes.
export default {
  presentation:
    'Gaeta, told by the people who live here: places, churches, feasts, recipes, tours.',
  projectStory: [
    'Vivere Gaeta is an archive of the town, written by the people who live in it. The feasts and their processions, the churches, the places, the recipes and where to find them, the historical figures, the words of the dialect, the books that tell of it, the tours that walk it: every entry bears the name of whoever wrote it, one of the contributors the author chose one by one. When an entry grows out of what others have already published, it is written in its own words and names its sources.',
    'It is not a satnav: for the way there are already the maps on your phone, and the entries send you to them. It is made for getting to know the place you are in — in front of a church that is closed, at the bar in the evening, or far from Gaeta, when you feel like rereading a story from home. It is written for those who come for a few days and want to really live it, and for those who were born here and carry it with them. Anyone can read it, without an account.',
  ],
} satisfies CopyWords
