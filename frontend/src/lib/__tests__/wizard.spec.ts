import { afterEach, describe, it, expect } from 'vitest'

import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { MapCardFeature } from '@/definitions/interfaces/MapData'
import { setLocale } from '@/lib/i18n'
import {
  afterIntent,
  asksWhere,
  contentLine,
  intentAnswers,
  resultOf,
  windowAnswers,
  zoneAnswers,
  zoneStepOf,
  type WizardArchive,
  type WizardTour,
} from '../wizard'

const intent = (slug: string, count = 0): Intent => ({
  slug,
  name: slug,
  name_plural: slug,
  description: '',
  count,
})

const feature = (over: Partial<MapCardFeature>): MapCardFeature => ({
  id: 'x',
  type: 'luoghi',
  title: 'X',
  is_published: true,
  cover: null,
  points: [],
  route: [],
  zones: [],
  genre: null,
  kind: null,
  access: null,
  ...over,
})

const tour = (over: Partial<WizardTour>): WizardTour => ({
  id: 't',
  title: 'Giro',
  intents: [],
  zones: [],
  ...over,
})

const ZONES = [
  { slug: 'gaeta-medievale', name: 'Gaeta Medievale' },
  { slug: 'serapo', name: 'Serapo' },
  { slug: 'porto-salvo', name: 'Porto Salvo' },
]

const archive = (over: Partial<WizardArchive> = {}): WizardArchive => ({
  intents: [
    intent('mare'),
    intent('citta'),
    intent('camminare'),
    intent('mangiare'),
    intent('bere'),
  ],
  features: [],
  tours: [],
  dishes: 0,
  ...over,
})

const slugs = (a: WizardArchive) => intentAnswers(a).map((answer) => answer.slug)

// The wizard «Cosa fare adesso» (review of 2026-10-22, study 10; PR-21): its
// rules, held here so a change to them is a change to this file.
describe('the wizard’s first step: an answer only with something behind it', () => {
  it('offers nothing on an empty archive', () => {
    expect(intentAnswers(archive())).toEqual([])
  })

  it('opens an intent on a published tour, a place filed under it, or — for Mangiare — a dish', () => {
    const answers = intentAnswers(
      archive({
        intents: [intent('mare'), intent('citta', 2), intent('camminare'), intent('mangiare')],
        features: [feature({ title: 'Serapo', genre: 'spiaggia' })],
        dishes: 3,
      }),
    )

    // In the admin's order, each saying what is behind it.
    expect(answers.map((answer) => [answer.slug, answer.line])).toEqual([
      ['mare', '1 luogo'],
      ['citta', '2 itinerari'],
      ['mangiare', '3 ricette'],
    ])
  })

  it('counts on what the public reads: a collaborator’s draft opens nothing (map.md M5)', () => {
    const drafts = archive({
      features: [feature({ genre: 'spiaggia', is_published: false })],
    })
    expect(slugs(drafts)).toEqual([])
  })

  // Decided on 2026-10-23 (ADR-0010): «Bere» leads to where one drinks, and
  // is there only once one is published; «Mangiare» shows the tables beside
  // the dishes.
  it('offers «Bere» only once a business where one drinks is published', () => {
    expect(slugs(archive({ features: [feature({ type: 'attivita', kind: 'mangia' })] }))).toEqual([
      'mangiare',
    ])
    expect(slugs(archive({ features: [feature({ type: 'attivita', kind: 'beve' })] }))).toEqual([
      'bere',
    ])
  })

  it('never offers a churches’ or a feast’s own answer: a church is the town, a feast a date', () => {
    const answers = slugs(
      archive({
        features: [feature({ type: 'chiese' }), feature({ type: 'feste', zones: ['serapo'] })],
      }),
    )
    expect(answers).toEqual(['citta'])
  })

  it('says what is behind an answer in one line', () => {
    expect(contentLine(2, 1, 0)).toBe('2 luoghi · 1 itinerario')
    expect(contentLine(0, 0, 1)).toBe('1 ricetta')
  })
})

describe('the wizard’s «Oggi» and «Questa settimana» (cosa-fare.md Part −1 D9)', () => {
  it('offers each window only when something falls in it', () => {
    expect(windowAnswers({ oggi: 0, settimana: 0 })).toEqual([])
    expect(windowAnswers({ oggi: 0, settimana: 2 }).map((w) => [w.key, w.line])).toEqual([
      ['settimana', '2 eventi'],
    ])
    expect(windowAnswers({ oggi: 1, settimana: 1 }).map((w) => [w.name, w.line])).toEqual([
      ['Oggi', '1 evento'],
      ['Questa settimana', '1 evento'],
    ])
  })
})

describe('the wizard’s second step: «Dove?»', () => {
  const beaches = archive({
    features: [
      feature({ id: 'a', title: 'Serapo', genre: 'spiaggia', zones: ['serapo'] }),
      feature({ id: 'b', title: 'Ariana', genre: 'spiaggia', zones: ['serapo'] }),
      feature({ id: 'c', title: 'Fontania', genre: 'spiaggia', zones: ['porto-salvo'] }),
      feature({
        id: 'd',
        title: 'Draft',
        genre: 'spiaggia',
        zones: ['gaeta-medievale'],
        is_published: false,
      }),
    ],
    tours: [tour({ title: 'Giro delle spiagge', intents: ['mare'], zones: ['serapo'] })],
  })

  it('offers the zones holding something of the intent, in the admin’s order, naming it', () => {
    expect(zoneAnswers(beaches, 'mare', ZONES)).toEqual([
      { slug: 'serapo', name: 'Serapo', line: 'Ariana · Serapo…' },
      { slug: 'porto-salvo', name: 'Porto Salvo', line: 'Fontania' },
    ])
  })

  it('asks where when two zones hold something, and leads there', () => {
    expect(asksWhere(beaches, 'mare', ZONES)).toBe(true)
    expect(afterIntent(beaches, 'mare', ZONES)).toEqual(zoneStepOf('mare'))
    expect(zoneStepOf('mare')).toEqual({ name: 'home', query: { intento: 'mare' } })
  })

  it('skips the question when one zone holds all of it, straight to that zone', () => {
    const one = archive({
      features: [feature({ genre: 'spiaggia', zones: ['serapo'] })],
    })
    expect(asksWhere(one, 'mare', ZONES)).toBe(false)
    expect(afterIntent(one, 'mare', ZONES)).toEqual({
      name: 'cosafare',
      query: { intento: 'mare', zona: 'serapo' },
    })
  })

  it('asks after all when the one zone does not hold all of it: «Ovunque» is a second answer', () => {
    const outside = archive({
      features: [
        feature({ genre: 'spiaggia', zones: ['serapo'] }),
        feature({ id: 'y', genre: 'spiaggia', zones: [] }),
      ],
    })
    expect(asksWhere(outside, 'mare', ZONES)).toBe(true)
  })

  it('skips to «Ovunque a Gaeta» when no zone holds anything of it — the dishes are in none', () => {
    const dishes = archive({ dishes: 2 })
    expect(afterIntent(dishes, 'mangiare', ZONES)).toEqual(resultOf('mangiare'))
    expect(resultOf('mangiare')).toEqual({ name: 'cosafare', query: { intento: 'mangiare' } })
  })
})

// In the reader's language (review PR-19a): the lines under the answers, and
// the intents' and zones' names where the author wrote English ones.
describe('the wizard in English', () => {
  afterEach(() => setLocale('it'))

  it('counts in English', async () => {
    await setLocale('en')

    expect(contentLine(2, 1, 1)).toBe('2 places · 1 tour · 1 recipe')
    expect(
      windowAnswers({ oggi: 1, settimana: 3 }).map((window) => [window.name, window.line]),
    ).toEqual([
      ['Today', '1 event'],
      ['This week', '3 events'],
    ])
  })

  it('names an intent and a zone in English where they have an English name, in Italian otherwise', async () => {
    const tours = [tour({ intents: ['mare'], zones: ['serapo'] })]
    const zones = [
      { slug: 'serapo', name: 'Serapo' },
      { slug: 'gaeta-medievale', name: 'Gaeta Medievale', name_en: 'Medieval Gaeta' },
    ]
    const withNames = archive({
      intents: [{ ...intent('mare', 1), name: 'Andare al mare', name_en: 'Going to the beach' }],
      tours: [...tours, tour({ id: 'u', intents: ['mare'], zones: ['gaeta-medievale'] })],
    })
    await setLocale('en')

    expect(intentAnswers(withNames).map((answer) => answer.name)).toEqual(['Going to the beach'])
    expect(zoneAnswers(withNames, 'mare', zones).map((zone) => zone.name)).toEqual([
      'Serapo',
      'Medieval Gaeta',
    ])
  })

  // Review PR-19b: an intent's line in the author's English, and the Italian
  // where they have written none — marked Italian, so it is read as such.
  it('says an intent’s line in English where the author wrote one, and marks the Italian otherwise', async () => {
    const lines = archive({
      intents: [
        {
          ...intent('mare', 1),
          description: 'Le spiagge, e gli itinerari lungo il mare',
          description_en: 'The beaches, and tours along the coast',
        },
        { ...intent('citta', 1), description: 'Chiese e musei, e gli itinerari' },
      ],
    })
    const read = () =>
      intentAnswers(lines).map((answer) => [answer.description, answer.descriptionLang])

    expect(read()).toEqual([
      ['Le spiagge, e gli itinerari lungo il mare', undefined],
      ['Chiese e musei, e gli itinerari', undefined],
    ])
    await setLocale('en')
    expect(read()).toEqual([
      ['The beaches, and tours along the coast', undefined],
      ['Chiese e musei, e gli itinerari', 'it'],
    ])
  })
})
