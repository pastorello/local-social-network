import { afterEach, describe, it, expect, vi } from 'vitest'

import {
  defineMessages,
  firstLocale,
  initLocale,
  intlLocale,
  locale,
  localName,
  localPlural,
  setLocale,
} from '@/lib/i18n'
import shell from '@/lib/i18n/messages/shell'

// Which language the reader's interface speaks (review PR-19a, decision 5 of
// 2026-10-22): the address's, then the reader's last choice, then English
// for a browser that asks for it — Italian for everyone else.
afterEach(() => {
  setLocale('it')
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

describe('the first language', () => {
  it('is the address’s when it names one', () => {
    expect(firstLocale('en', 'it', 'it-IT')).toBe('en')
    expect(firstLocale('it', 'en', 'en-GB')).toBe('it')
  })

  it('is the reader’s last choice without one', () => {
    expect(firstLocale(null, 'en', 'it-IT')).toBe('en')
    expect(firstLocale('de', 'it', 'en-US')).toBe('it')
  })

  it('is English only for a browser that asks for English, on a first visit', () => {
    expect(firstLocale(null, null, 'en-US')).toBe('en')
    expect(firstLocale(null, null, 'EN')).toBe('en')
    expect(firstLocale(null, null, 'it-IT')).toBe('it')
    expect(firstLocale(null, null, 'de-CH')).toBe('it')
    expect(firstLocale(null, null, undefined)).toBe('it')
  })
})

describe('choosing a language', () => {
  it('sets the page’s language and remembers it', async () => {
    await setLocale('en')

    expect(locale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('lang')).toBe('en')
    expect(intlLocale()).toBe('en-GB')
  })

  it('still switches where storage refuses — a private window', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    await setLocale('en')

    expect(locale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('reads the address on arrival, and remembers a language it names', () => {
    window.history.replaceState(null, '', '/cosa-fare?lang=en')

    initLocale()

    expect(locale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('lang')).toBe('en')
  })

  it('does not remember the browser’s language, which is asked again next time', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')

    initLocale()

    expect(locale.value).toBe('en')
    expect(localStorage.getItem('lang')).toBeNull()
  })

  it('reads storage that throws as no choice at all', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('it-IT')

    initLocale()

    expect(locale.value).toBe('it')
  })
})

describe('a dictionary', () => {
  const words = defineMessages({
    it: { hello: 'Ciao', count: (n: number) => (n === 1 ? '1 scheda' : `${n} schede`) },
    en: { hello: 'Hello', count: (n: number) => (n === 1 ? '1 entry' : `${n} entries`) },
  })

  it('says the current language’s words', async () => {
    expect(words().hello).toBe('Ciao')
    expect(words().count(3)).toBe('3 schede')

    await setLocale('en')

    expect(words().hello).toBe('Hello')
    expect(words().count(1)).toBe('1 entry')
  })
})

describe('the first paint’s words', () => {
  it('switch to English only once their English is loaded, and back to Italian at once', async () => {
    await setLocale('en')
    expect(shell().nav.map).toBe('Map')
    expect(shell.en.nav.map).toBe('Map')

    void setLocale('it')
    expect(shell().nav.map).toBe('Mappa')
  })
})

describe('a name the API serves in both languages', () => {
  it('is the English one in English, and the Italian when there is none', async () => {
    const genre = { name: 'Spiaggia', name_en: 'Beach', name_plural: 'Spiagge', name_plural_en: '' }
    const zone = { name: 'Gaeta Medievale', name_en: '' }

    expect(localName(genre)).toBe('Spiaggia')
    await setLocale('en')
    expect(localName(genre)).toBe('Beach')
    expect(localName(zone)).toBe('Gaeta Medievale')
    expect(localPlural(genre)).toBe('Spiagge')
  })
})
