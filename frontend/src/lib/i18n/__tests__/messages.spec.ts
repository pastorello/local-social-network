import { beforeAll, describe, it, expect } from 'vitest'

import copy from '@/definitions/copy'
import { loadEnglish, type Dictionary } from '@/lib/i18n'

// The reader's interface in two languages (review PR-19a): every key in both,
// of the same kind, taking the same arguments, and none left empty. The
// compiler holds most of this already — each English dictionary is typed by
// its Italian one — and this holds it at run time too, for a key added in a
// hurry with a cast. Every message file in ../messages is read, so a new one
// is checked without being listed here — the first paint's areas once their
// English, a chunk of its own (english.ts), is loaded.
const modules = import.meta.glob<Record<string, unknown>>('../messages/*.ts', { eager: true })

const isDictionary = (value: unknown): value is Dictionary<Record<string, unknown>> =>
  typeof value === 'function' && 'it' in value && 'en' in value

const dictionaries: [string, Dictionary<Record<string, unknown>>][] = [
  ...Object.entries(modules).flatMap(([path, exports]) =>
    Object.entries(exports)
      .filter(([, value]) => isDictionary(value))
      .map(([name, value]) => [`${path.replace('../messages/', '')} ${name}`, value] as const),
  ),
  ['definitions/copy.ts default', copy as Dictionary<Record<string, unknown>>],
] as [string, Dictionary<Record<string, unknown>>][]

type Problem = string

// Walks the Italian and the English side by side and says what differs.
const compare = (it: unknown, en: unknown, path: string, problems: Problem[]) => {
  if (typeof it === 'string') {
    if (typeof en !== 'string') problems.push(`${path}: the English is not a string`)
    else if (!it.trim() || !en.trim()) problems.push(`${path}: empty`)
    return
  }
  if (Array.isArray(it)) {
    if (!Array.isArray(en)) problems.push(`${path}: the English is not a list`)
    else if (it.length !== en.length) problems.push(`${path}: ${it.length} ≠ ${en.length} items`)
    else it.forEach((item, index) => compare(item, en[index], `${path}[${index}]`, problems))
    return
  }
  if (typeof it === 'function') {
    if (typeof en !== 'function') problems.push(`${path}: the English is not a function`)
    else if (it.length !== en.length) problems.push(`${path}: different arguments`)
    else {
      // Called with stand-ins for its arguments: a sentence comes back.
      const args = Array.from({ length: it.length }, (_, index) => (index === 0 ? 2 : 'x'))
      for (const [side, fn] of [
        ['it', it],
        ['en', en],
      ] as const) {
        const said = (fn as (...values: unknown[]) => unknown)(...args)
        if (typeof said !== 'string' || !said.trim()) problems.push(`${path} (${side}): no words`)
      }
    }
    return
  }
  if (it && typeof it === 'object') {
    if (!en || typeof en !== 'object' || Array.isArray(en)) {
      problems.push(`${path}: the English is not a group`)
      return
    }
    const itKeys = Object.keys(it)
    const enKeys = Object.keys(en)
    for (const key of itKeys.filter((key) => !enKeys.includes(key)))
      problems.push(`${path}.${key}: missing in English`)
    for (const key of enKeys.filter((key) => !itKeys.includes(key)))
      problems.push(`${path}.${key}: missing in Italian`)
    for (const key of itKeys.filter((key) => enKeys.includes(key)))
      compare(
        (it as Record<string, unknown>)[key],
        (en as Record<string, unknown>)[key],
        `${path}.${key}`,
        problems,
      )
    return
  }
  problems.push(`${path}: not a message`)
}

describe('the interface’s two languages', () => {
  beforeAll(loadEnglish)

  it('reads every message file', () => {
    // shell, types, home, wizard, cosaFare, visit, dates, card, lists, tours,
    // events, project — and copy.ts.
    expect(dictionaries.length).toBeGreaterThanOrEqual(13)
  })

  it.each(dictionaries)('%s has every key in both languages', (_name, dictionary) => {
    const problems: Problem[] = []
    compare(dictionary.it, dictionary.en, '', problems)
    expect(problems).toEqual([])
  })

  it('fails on a key one language does not have', () => {
    const problems: Problem[] = []
    compare({ a: 'Ciao', b: { c: 'Su' } }, { a: 'Hello', b: {} }, '', problems)
    compare({ n: (count: number) => `${count}` }, { n: () => '' }, '', problems)
    expect(problems).toEqual(['.b.c: missing in English', '.n: different arguments'])
  })
})
