import copy from '@/definitions/copy.en'
import archive from './archive.en'
import cosaFare from './cosaFare.en'
import home from './home.en'
import shell from './shell.en'
import types from './types.en'
import visit from './visit.en'
import wizard from './wizard.en'

// The English of the first paint's areas (review PR-19a), one chunk that only
// an English reader loads: lib/i18n/index.ts::loadEnglish imports it, before
// the first paint for a reader who arrives in English, and before the switch
// turns English on. Each area's English sits beside its Italian, in
// <area>.en.ts. The pages that load later keep both languages in one file:
// their words travel in their own chunk already.
const english = { archive, copy, cosaFare, home, shell, types, visit, wizard }

export type EntryEnglish = typeof english

export default english
