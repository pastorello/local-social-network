import { afterEach, describe, it, expect } from 'vitest'

import { setLocale } from '@/lib/i18n'

import {
  atPlace,
  displayName,
  matchPlaces,
  normalizePlace,
  placeOptions,
  placeSentence,
} from '../placeNames'

const ZONES = [
  { slug: 'gaeta-medievale', name: 'Gaeta Medievale' },
  { slug: 'serapo', name: 'Serapo' },
  { slug: 'porto-salvo', name: 'Porto Salvo' },
  { slug: 'montagna-spaccata', name: 'Montagna Spaccata' },
]
const ALIASES = [
  { name: 'il castello', zone: 'gaeta-medievale' },
  { name: 'Piazza XIX Maggio', zone: 'porto-salvo' },
  { name: 'il Santuario della Trinità', zone: 'montagna-spaccata' },
  { name: 'la Montagna Spaccata', zone: 'montagna-spaccata' },
  { name: 'Serapo', zone: 'serapo' },
  { name: "Sant'Agostino", zone: 'piana-di-sant-agostino' },
]

const names = (query: string) =>
  matchPlaces(query, placeOptions(ALIASES, ZONES)).map((option) => option.name)

// Review of 2026-10-22, decision 3: the name a guest types, without accents,
// capitals or articles, and with what they put before it.
describe('normalizePlace', () => {
  it('drops accents, capitals and apostrophes', () => {
    expect(normalizePlace('Trinità')).toBe('trinita')
    expect(normalizePlace('  SANT’AGOSTINO ')).toBe('sant agostino')
    expect(normalizePlace('Piazza XIX Maggio')).toBe('piazza xix maggio')
  })

  it('drops the article a name is written with, whichever it is', () => {
    expect(normalizePlace('il castello')).toBe('castello')
    expect(normalizePlace("l'Arenauta")).toBe('arenauta')
    expect(normalizePlace('la Cattedrale')).toBe('cattedrale')
    expect(normalizePlace('i Quaranta Remi')).toBe('quaranta remi')
  })

  it('drops what a guest says before a name', () => {
    expect(normalizePlace('al porto')).toBe('porto')
    expect(normalizePlace('davanti al castello')).toBe('castello')
    expect(normalizePlace('sono a Serapo')).toBe('serapo')
    expect(normalizePlace('in Piazza XIX Maggio')).toBe('piazza xix maggio')
  })

  it('never drops the last word, so a single letter still searches', () => {
    expect(normalizePlace('a')).toBe('a')
    expect(normalizePlace('il')).toBe('il')
  })
})

describe('placeOptions', () => {
  it('offers the author’s names, then every zone by its own name, once each', () => {
    const options = placeOptions(ALIASES, ZONES)

    expect(options.map((option) => option.name)).toEqual([
      'il castello',
      'Piazza XIX Maggio',
      'il Santuario della Trinità',
      'Montagna Spaccata',
      'Serapo',
      'Gaeta Medievale',
      'Porto Salvo',
    ])
    // A name that is its zone's own is offered as the zone.
    expect(options.find((option) => option.name === 'Serapo')?.isZone).toBe(true)
    expect(options.find((option) => option.name === 'il castello')?.isZone).toBe(false)
  })

  it('does not offer a name whose zone it does not know', () => {
    expect(placeOptions(ALIASES, ZONES).some((option) => option.name === "Sant'Agostino")).toBe(
      false,
    )
    expect(placeOptions(ALIASES, [])).toEqual([])
  })
})

describe('matchPlaces', () => {
  it('finds a name with or without its article, accents or capitals', () => {
    expect(names('castello')).toEqual(['il castello'])
    expect(names('Il Castello')).toEqual(['il castello'])
    expect(names('davanti al castello')).toEqual(['il castello'])
    expect(names('trinita')).toEqual(['il Santuario della Trinità'])
  })

  it('puts the name itself first, then the names it begins, then a word it begins', () => {
    expect(names('serapo')).toEqual(['Serapo'])
    expect(names('piazza')).toEqual(['Piazza XIX Maggio'])
    expect(names('mag')).toEqual(['Piazza XIX Maggio'])
    // «porto» is no name in this list: it begins a zone's.
    expect(names('porto')).toEqual(['Porto Salvo'])
  })

  it('finds a name the query holds whole', () => {
    expect(names('spiaggia di Serapo')).toEqual(['Serapo'])
  })

  it('offers everything for nothing typed, and nothing for a name nobody listed', () => {
    expect(names('')).toHaveLength(7)
    expect(names('xyz')).toEqual([])
  })
})

describe('the line under the field', () => {
  it('takes the preposition the name is written for', () => {
    expect(atPlace('il porto')).toBe('al porto')
    expect(atPlace('la Cattedrale')).toBe('alla Cattedrale')
    expect(atPlace("l'Annunziata")).toBe("all'Annunziata")
    expect(atPlace('i Quaranta Remi')).toBe('ai Quaranta Remi')
    expect(atPlace('Piazza XIX Maggio')).toBe('in Piazza XIX Maggio')
    expect(atPlace('Corso Cavour')).toBe('in Corso Cavour')
    expect(atPlace('San Vito')).toBe('a San Vito')
    expect(atPlace('Ariana')).toBe('ad Ariana')
  })

  it('says where the guest is and which zone is shown — and only the zone for a zone', () => {
    const [castello, , , montagna] = placeOptions(ALIASES, ZONES)

    expect(placeSentence(castello!)).toBe('Sei al castello: ti mostriamo Gaeta Medievale.')
    expect(placeSentence(montagna!)).toBe('Ti mostriamo Montagna Spaccata.')
  })

  it('shows a name with a capital, as the start of an entry', () => {
    expect(displayName('il castello')).toBe('Il castello')
    expect(displayName('Serapo')).toBe('Serapo')
  })
})

// In the reader's language (review PR-19a): the names are Gaeta's, as the
// signs spell them, and an English reader's «I'm at the» is left out like
// «sono al». A zone with an English name is offered by it too.
describe('«Dove sei?» in English', () => {
  afterEach(() => setLocale('it'))

  it('says where the guest is in English, the name as Gaeta writes it', async () => {
    await setLocale('en')
    const [castello, , , montagna] = placeOptions(ALIASES, ZONES)

    expect(placeSentence(castello!)).toBe(
      'Il castello is in Gaeta Medievale: here is what there is.',
    )
    expect(placeSentence(montagna!)).toBe('Here is what there is in Montagna Spaccata.')
  })

  it('leaves out what an English reader puts before a name', () => {
    expect(normalizePlace("I'm at the castello")).toBe('castello')
    expect(names('near Serapo')).toEqual(['Serapo'])
  })

  it('shows a zone by its English name in English, and finds it by its Italian one', async () => {
    const zones = [{ slug: 'gaeta-medievale', name: 'Gaeta Medievale', name_en: 'Medieval Gaeta' }]
    await setLocale('en')

    const options = placeOptions([{ name: 'il castello', zone: 'gaeta-medievale' }], zones)

    expect(options.map((option) => option.name)).toEqual(['il castello', 'Medieval Gaeta'])
    expect(options[0]!.zoneName).toBe('Medieval Gaeta')
    expect(matchPlaces('gaeta medievale', options).map((option) => option.zone)).toEqual([
      'gaeta-medievale',
    ])
  })
})
