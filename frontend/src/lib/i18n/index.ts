import { ref, shallowRef } from 'vue'

import type { EntryEnglish } from './messages/english'

// The reader's interface in two languages (review PR-19a, decided on
// 2026-10-22; spec translations.md T9). Italian is the archive's language and
// the default; English is for the tourist the archive is ultimately for. The
// collaborator's surfaces — the forms, the account, the reports, the polls —
// stay Italian (T4 holds for them), and so does every card's own text: this
// translates the interface around it, never the content.
//
// A typed dictionary rather than vue-i18n, measured on 2026-10-25: vue-i18n
// added 18.8 kB (gzip) to the JavaScript the first paint loads, 11.1 kB in its
// runtime-only build, against a budget the Lighthouse gate holds on a phone
// (TD-52). Here a message is a string, or a function when it is built from a
// value — a count, a name — so plurals are plain code and the compiler checks
// that both languages have every key and take the same arguments. Each area
// keeps its own file in ./messages, imported by what uses it, so a page's
// words travel in that page's chunk; lib/i18n/__tests__/messages.spec.ts
// fails when a key is missing from either language.
//
// The areas of the first paint — the shell, the home, the wizard, «Cosa si può
// fare qui» — keep their English apart, in a chunk only an English reader
// loads (./messages/english.ts): the same day, the dictionaries with both
// languages in the entry cost the gate's pages 80–150 ms of LCP on
// Lighthouse's phone, the cost of their 5.5 kB (a 5.5 kB string in the same
// place cost the same), and the Italian reader is most readers.
export const LOCALES = ['it', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

// Italian until main.ts reads the reader's choice (initLocale): a unit test,
// which never runs main.ts, reads the interface in Italian.
export const locale = ref<Locale>('it')

// A paragraph list (Il progetto's story) is the one kind of message that is
// neither a sentence nor built from a value.
export type Message = string | readonly string[] | ((...args: never[]) => string)
export interface Messages {
  [key: string]: Message | Messages
}

// One area's words in both languages; calling it gives the current one's.
// Read inside a template, a computed or a watcher, it follows the switch.
// An area of the first paint has its `en` only once English is loaded.
export type Dictionary<T> = (() => T) & { readonly it: T; readonly en: T }

// The Italian decides the shape and the English must match it: every key,
// and each function's arguments. What the Italian returns is widened to a
// string first — a plural written as a ternary is typed as its two Italian
// words, which no English could match.
export type Widen<T> = T extends string
  ? string
  : T extends readonly string[]
    ? readonly string[]
    : T extends (...args: infer A) => string
      ? (...args: A) => string
      : { [K in keyof T]: Widen<T[K]> }

export const defineMessages = <T extends Messages>(pair: {
  it: T
  en: NoInfer<Widen<T>>
}): Dictionary<Widen<T>> => {
  // The same objects: only their declared type is widened.
  const both = pair as unknown as { it: Widen<T>; en: Widen<T> }
  return Object.assign(() => both[locale.value], both)
}

// The English of the first paint's areas, once loaded (setLocale, initLocale).
const english = shallowRef<EntryEnglish | null>(null)
let loading: Promise<void> | null = null

export const loadEnglish = (): Promise<void> =>
  (loading ??= import('./messages/english').then((module) => {
    english.value = module.default
  }))

// An area of the first paint: its Italian here, its English in
// ./messages/<area>.en.ts, typed by this Italian (`satisfies`). Until English
// is loaded it answers in Italian, which setLocale never lets a reader see.
export const defineEntryMessages = <T extends Messages>(
  area: keyof EntryEnglish,
  it: T,
): Dictionary<Widen<T>> => {
  const italian = it as unknown as Widen<T>
  const inEnglish = () => english.value?.[area] as Widen<T> | undefined
  const read = () => (locale.value === 'en' && inEnglish()) || italian
  return Object.defineProperties(read, {
    it: { value: italian },
    en: { get: inEnglish },
  }) as Dictionary<Widen<T>>
}

// The locale `Intl` formats with: British English, whose dates read «Saturday
// 26 September» and whose clock is the 24-hour one Gaeta's posters use.
export const intlLocale = (): string => (locale.value === 'en' ? 'en-GB' : 'it-IT')

// A name the API serves in both languages (Zona, Genre, Intent — review
// PR-19a): the English one when there is one, the Italian otherwise. A proper
// name has none on purpose, and reads the same in both.
export const localName = (named: { name: string; name_en?: string | null }): string =>
  (locale.value === 'en' && named.name_en) || named.name

export const localPlural = (named: {
  name_plural: string
  name_plural_en?: string | null
}): string => (locale.value === 'en' && named.name_plural_en) || named.name_plural

// The choice lives in the address (`?lang=en`, so a shared link carries it)
// and in this browser's storage, for the next visit. Storage can be missing or
// refuse — a private window, blocked site data — and then the address and the
// browser's own language decide each time.
const STORAGE_KEY = 'lang'

const storedLocale = (): Locale | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

const storeLocale = (value: Locale) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Nowhere to remember it: the address still carries it.
  }
}

// The address's language first, then the one this reader chose last time;
// with neither, English for a browser that asks for it and Italian for every
// other — the archive's own language, not a guess at the reader's.
export const firstLocale = (
  asked: string | null,
  stored: Locale | null,
  browser: string | undefined,
): Locale => {
  if (isLocale(asked)) return asked
  if (stored) return stored
  return browser?.toLowerCase().startsWith('en') ? 'en' : 'it'
}

const apply = (value: Locale) => {
  locale.value = value
  // `<html lang>` follows (WCAG 3.1.1): a screen reader reads the page in its
  // language, and the card's own Italian is marked where it sits (3.1.2).
  document.documentElement.lang = value
}

// English is switched on once its words are here, so nothing is drawn half
// in one language; Italian at once. A failed load leaves the language as it
// was, and says so to the caller.
export const setLocale = async (value: Locale): Promise<void> => {
  if (value === 'en') await loadEnglish()
  apply(value)
  storeLocale(value)
}

// The reader's language on arrival. Italian, or English already loaded, is
// set at once and returns null; English to load returns the promise main.ts
// waits for before the first paint, so it is drawn once, in its language —
// and in Italian should the load fail.
export const initLocale = (): Promise<void> | null => {
  const asked = new URLSearchParams(window.location.search).get('lang')
  const value = firstLocale(asked, storedLocale(), navigator.language)
  // Only a language somebody chose is remembered: the address's, or later
  // the switch's — not the browser's, which is asked again next time.
  if (isLocale(asked)) storeLocale(value)
  if (value === 'it' || english.value) {
    apply(value)
    return null
  }
  apply('it')
  return loadEnglish().then(
    () => apply('en'),
    () => undefined,
  )
}
