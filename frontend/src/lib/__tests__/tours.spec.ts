import { describe, it, expect } from 'vitest'

import { afterTour, pointOf, stopsByPlace, type StopDraft } from '../tours'
import type { Intent } from '@/definitions/interfaces/Itinerario'

describe('pointOf', () => {
  const stop = (patch: Partial<StopDraft>): StopDraft => ({
    card: 'c',
    type: 'luoghi',
    title: 'T',
    point_index: null,
    points: [],
    route: [],
    savedPoint: null,
    note: '',
    ...patch,
  })

  it('is the chosen pin, else the first, else a route’s start, else the saved point', () => {
    const a = { lat: 1, lng: 1, label: '' }
    const b = { lat: 2, lng: 2, label: '' }
    expect(pointOf(stop({ points: [a, b], point_index: 1 }))).toEqual(b)
    expect(pointOf(stop({ points: [a, b] }))).toEqual(a)
    expect(pointOf(stop({ route: [b, a] }))).toEqual(b)
    expect(pointOf(stop({ savedPoint: a }))).toEqual(a)
  })
})

describe('stopsByPlace (review PR-7)', () => {
  it('gives stops on one spot one marker carrying all their numbers', () => {
    const square = { lat: 41.21, lng: 13.57 }
    const beach = { lat: 41.2105, lng: 13.564 }

    expect(stopsByPlace([square, { ...square }, beach, square])).toEqual([
      { point: square, numbers: [1, 2, 4] },
      { point: beach, numbers: [3] },
    ])
  })

  it('keeps apart two stops a few metres from each other', () => {
    const places = stopsByPlace([
      { lat: 41.21, lng: 13.57 },
      { lat: 41.2101, lng: 13.57 },
    ])

    expect(places.map((place) => place.numbers)).toEqual([[1], [2]])
  })
})

describe('afterTour — what the last stop offers (review PR-7)', () => {
  const intent = (slug: string, count: number): Intent => ({
    slug,
    name: slug === 'citta' ? 'Scoprire la città' : 'Andare al mare',
    name_plural: '',
    description: '',
    count,
  })
  const serapo = { slug: 'serapo', name: 'Serapo' }
  const base = {
    intents: ['mare', 'citta'],
    isPublished: true,
    intentCounts: [intent('mare', 1), intent('citta', 2)],
    tours: 2,
    zone: serapo,
    ricette: 1,
  }

  it('offers another tour for the same wish, what is around, and something to eat', () => {
    expect(afterTour(base)).toEqual([
      {
        label: 'Un altro itinerario',
        detail: 'Scoprire la città',
        to: { path: '/itinerari', query: { intento: 'citta' } },
      },
      {
        label: 'Cosa c’è qui intorno',
        detail: 'Serapo',
        to: { path: '/cosa-fare', query: { zona: 'serapo' } },
      },
      { label: 'Da mangiare', detail: 'Le ricette di Gaeta', to: '/ricette' },
    ])
  })

  it('falls back to every tour when no other shares the wish', () => {
    const links = afterTour({ ...base, intentCounts: [intent('mare', 1), intent('citta', 1)] })

    expect(links[0]).toEqual({
      label: 'Un altro itinerario',
      detail: 'Tutti gli itinerari',
      to: '/itinerari',
    })
  })

  it('promises nothing that is not there', () => {
    const links = afterTour({
      ...base,
      intentCounts: [intent('mare', 1), intent('citta', 1)],
      tours: 1,
      zone: null,
      ricette: 0,
    })

    expect(links).toEqual([])
  })

  it('counts a draft tour out of the published ones it is compared with', () => {
    const links = afterTour({
      ...base,
      isPublished: false,
      intentCounts: [intent('mare', 1)],
      tours: 1,
    })

    expect(links[0]?.to).toEqual({ path: '/itinerari', query: { intento: 'mare' } })
  })
})
