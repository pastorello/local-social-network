import { describe, it, expect } from 'vitest'

import router from '@/router'
import { parentOf, type Parent } from '../navigation'

const ID = '5f0c6a52-6a0e-4f0a-9d3b-0a9f6e1c2b7d'

// Up, for every page the router knows (review PR-22, N-03): one level, and
// nothing for a page whose only parent is the map, which its close button is.
const EXPECTED: Record<string, Parent | null> = {
  '/': null,
  '/il-progetto': null,
  '/reports/:id': { to: '/', label: 'Mappa' },
  '/collabora': null,
  '/login': null,
  '/invito/:token': null,
  '/password-dimenticata': null,
  '/reimposta-password/:token': null,
  '/users': null,
  '/polls': null,
  '/feste': null,
  '/feste/nuova': { to: '/feste', label: 'Feste' },
  '/feste/:id': { to: '/feste', label: 'Feste' },
  '/chiese': null,
  '/chiese/nuova': { to: '/chiese', label: 'Chiese' },
  '/chiese/:id': { to: '/chiese', label: 'Chiese' },
  '/ricette': null,
  '/ricette/nuova': { to: '/ricette', label: 'Ricette' },
  '/ricette/:id': { to: '/ricette', label: 'Ricette' },
  '/personaggi': null,
  '/personaggi/nuovo': { to: '/personaggi', label: 'Personaggi storici' },
  '/personaggi/:id': { to: '/personaggi', label: 'Personaggi storici' },
  '/dialetto': null,
  '/dialetto/nuovo': { to: '/dialetto', label: 'Dialetto' },
  '/dialetto/:id': { to: '/dialetto', label: 'Dialetto' },
  '/luoghi': null,
  '/luoghi/nuovo': { to: '/luoghi', label: 'Luoghi' },
  '/luoghi/:id': { to: '/luoghi', label: 'Luoghi' },
  '/benvenuto': null,
  '/cosa-fare': null,
  '/itinerari': null,
  '/itinerari/nuovo': { to: '/itinerari', label: 'Itinerari' },
  '/itinerari/:id': { to: '/itinerari', label: 'Itinerari' },
  '/libri': null,
  '/libri/nuovo': { to: '/libri', label: 'Libri consigliati' },
  '/libri/:id': { to: '/libri', label: 'Libri consigliati' },
  '/profile/edit': null,
  '/profile/edit/password': null,
  '/profile/:id': null,
}

const at = (path: string) => router.resolve(path)

describe('parentOf', () => {
  it('has an answer for every route, so a new page is placed on purpose', () => {
    expect(
      router
        .getRoutes()
        .map((record) => record.path)
        .sort(),
    ).toEqual(Object.keys(EXPECTED).sort())
  })

  it.each(Object.entries(EXPECTED))('%s', (path, parent) => {
    expect(parentOf(at(path.replace(':id', ID).replace(':token', 'abc')))).toEqual(parent)
  })

  it('takes a stop up to its tour, the same page without the query', () => {
    expect(parentOf(at(`/itinerari/${ID}?tappa=3`))).toEqual({
      to: `/itinerari/${ID}`,
      label: 'Itinerario',
    })
    // Not a stop: the tour's own page, under the tours.
    expect(parentOf(at(`/itinerari/${ID}?tappa=nessuna`))).toEqual({
      to: '/itinerari',
      label: 'Itinerari',
    })
  })

  it('takes a chosen zone up to «Cosa fare»', () => {
    expect(parentOf(at('/cosa-fare?zona=serapo'))).toEqual({ to: '/cosa-fare', label: 'Cosa fare' })
  })

  it('keeps a list’s filter out of it — the list itself is under the map', () => {
    expect(parentOf(at('/luoghi?genere=spiaggia'))).toBeNull()
    expect(parentOf(at('/itinerari?intento=mare'))).toBeNull()
  })

  it('takes a card in edit or on the enlarged map up to its list all the same', () => {
    expect(parentOf(at(`/chiese/${ID}?edit=1`))).toEqual({ to: '/chiese', label: 'Chiese' })
    expect(parentOf(at(`/luoghi/${ID}?mappa=1`))).toEqual({ to: '/luoghi', label: 'Luoghi' })
  })
})
