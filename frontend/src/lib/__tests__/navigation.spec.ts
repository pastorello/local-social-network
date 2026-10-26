import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, it, expect } from 'vitest'

import router from '@/router'
import { setLocale } from '@/lib/i18n'
import { CARD_LAYERS } from '@/lib/mapLayers'
import { contrastRatio } from '@/lib/tokens'
import { parentOf, sectionOf, tintOf, type Parent, type Section } from '../navigation'

const ID = '5f0c6a52-6a0e-4f0a-9d3b-0a9f6e1c2b7d'

// Up, for every page the router knows (review PR-22, N-03): one level, and
// nothing for a page whose only parent is the map, which its close button is.
const EXPECTED: Record<string, Parent | null> = {
  '/': null,
  '/mappa': null,
  '/il-progetto': null,
  '/reports/:id': { to: '/mappa', label: 'Segnalazioni' },
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
  '/attivita': null,
  '/attivita/nuova': { to: '/attivita', label: 'Attività' },
  '/attivita/:id': { to: '/attivita', label: 'Attività' },
  '/benvenuto': null,
  '/cosa-fare': null,
  '/itinerari': null,
  '/itinerari/nuovo': { to: '/itinerari', label: 'Itinerari' },
  '/itinerari/:id': { to: '/itinerari', label: 'Itinerari' },
  '/libri': null,
  '/libri/nuovo': { to: '/libri', label: 'Libri consigliati' },
  '/libri/:id': { to: '/libri', label: 'Libri consigliati' },
  '/eventi': null,
  '/eventi/nuovo': { to: '/eventi', label: 'Eventi' },
  '/eventi/:id': { to: '/eventi', label: 'Eventi' },
  '/eventi/:id/modifica': { to: `/eventi/${ID}`, label: 'Evento' },
  '/le-mie-schede': null,
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

  // The wizard's third step (review PR-21), with a zone or anywhere in Gaeta;
  // its first two steps, on the welcome page, are under nothing but the map.
  it('takes the wizard’s answer up to «Cosa fare», and its questions nowhere', () => {
    const up = { to: '/cosa-fare', label: 'Cosa fare' }
    expect(parentOf(at('/cosa-fare?intento=mare&zona=serapo'))).toEqual(up)
    expect(parentOf(at('/cosa-fare?intento=mangiare'))).toEqual(up)
    expect(parentOf(at('/benvenuto?intento=citta'))).toBeNull()
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

// The menu's current item (review PR-23, N-02): the item above the page, for
// every page the router knows. The home — the welcome page, /benvenuto's
// since 2026-10-26 — marks nothing (review PR-25); the map, /mappa, is
// «Mappa»'s; the tours are *Esplora*'s and the feasts, dishes, people,
// dialect and books *Tradizioni*'s, since the same day.
const SECTIONS: Record<string, Section | null> = {
  '/': null,
  '/mappa': 'mappa',
  '/il-progetto': 'progetto',
  '/reports/:id': 'mappa',
  '/collabora': null,
  '/login': null,
  '/invito/:token': null,
  '/password-dimenticata': null,
  '/reimposta-password/:token': null,
  '/users': null,
  '/polls': null,
  '/feste': 'tradizioni',
  '/feste/nuova': 'tradizioni',
  '/feste/:id': 'tradizioni',
  '/chiese': 'esplora',
  '/chiese/nuova': 'esplora',
  '/chiese/:id': 'esplora',
  '/ricette': 'tradizioni',
  '/ricette/nuova': 'tradizioni',
  '/ricette/:id': 'tradizioni',
  '/personaggi': 'tradizioni',
  '/personaggi/nuovo': 'tradizioni',
  '/personaggi/:id': 'tradizioni',
  '/dialetto': 'tradizioni',
  '/dialetto/nuovo': 'tradizioni',
  '/dialetto/:id': 'tradizioni',
  '/luoghi': 'esplora',
  '/luoghi/nuovo': 'esplora',
  '/luoghi/:id': 'esplora',
  '/attivita': 'esplora',
  '/attivita/nuova': 'esplora',
  '/attivita/:id': 'esplora',
  '/benvenuto': null,
  '/cosa-fare': 'cosa-fare',
  '/itinerari': 'esplora',
  '/itinerari/nuovo': 'esplora',
  '/itinerari/:id': 'esplora',
  '/libri': 'tradizioni',
  '/libri/nuovo': 'tradizioni',
  '/libri/:id': 'tradizioni',
  '/eventi': null,
  '/eventi/nuovo': null,
  '/eventi/:id': null,
  '/eventi/:id/modifica': null,
  '/le-mie-schede': null,
  '/profile/edit': null,
  '/profile/edit/password': null,
  '/profile/:id': null,
}

// The way up is named in the reader's language (review PR-19a).
describe('parentOf, in English', () => {
  afterEach(() => setLocale('it'))

  it('names the level above in English', async () => {
    await setLocale('en')

    expect(parentOf(at(`/chiese/${ID}`))).toEqual({ to: '/chiese', label: 'Churches' })
    expect(parentOf(at(`/itinerari/${ID}?tappa=2`))?.label).toBe('Tour')
    expect(parentOf(at('/cosa-fare?zona=serapo'))?.label).toBe('What to do')
    expect(parentOf(at(`/eventi/${ID}`))?.label).toBe('Events')
  })
})

describe('sectionOf', () => {
  it('has an answer for every route, so a new page is placed on purpose', () => {
    expect(
      router
        .getRoutes()
        .map((record) => record.path)
        .sort(),
    ).toEqual(Object.keys(SECTIONS).sort())
  })

  it.each(Object.entries(SECTIONS))('%s', (path, section) => {
    expect(sectionOf(at(path.replace(':id', ID).replace(':token', 'abc')))).toBe(section)
  })

  it('keeps a stop and a chosen zone in their sections', () => {
    expect(sectionOf(at(`/itinerari/${ID}?tappa=2`))).toBe('esplora')
    expect(sectionOf(at('/cosa-fare?zona=serapo'))).toBe('cosa-fare')
  })
})

// The hex a token holds in main.css — the stylesheet is the source of truth
// (D8), so this reads it rather than a copy of its values. From the disk:
// Vitest hands a stylesheet imported `?raw` back empty. The ratio is WCAG
// 2.1's, from lib/tokens.ts.
const CSS = readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf8')
const token = (name: string): string => {
  const found = CSS.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))
  if (!found?.[1]) throw new Error(`${name} is not in main.css`)
  return found[1]
}

describe('tintOf — the eyebrow’s colour (review PR-23)', () => {
  it('wears the layer of a card’s type, and terracotta under no layer', () => {
    expect(tintOf({ to: '/chiese', label: 'Chiese' })).toBe('var(--color-layer-chiese)')
    expect(tintOf({ to: '/feste', label: 'Feste' })).toBe('var(--color-layer-feste)')
    expect(tintOf({ to: '/dialetto', label: 'Dialetto' })).toBe('var(--color-terracotta)')
    expect(tintOf({ to: `/itinerari/${ID}`, label: 'Giro' })).toBe('var(--color-terracotta)')
    expect(tintOf({ to: '/cosa-fare', label: 'Cosa fare' })).toBe('var(--color-terracotta)')
    expect(tintOf(null)).toBe('var(--color-terracotta)')
  })

  // Small text: WCAG 1.4.3 asks 4.5:1 of every colour it can be, on the
  // panel's ground.
  it.each([...CARD_LAYERS.map((layer) => layer.token), '--color-terracotta'])(
    '%s clears 4.5:1 on the panel',
    (name) => {
      expect(contrastRatio(token(name), token('--color-page'))).toBeGreaterThanOrEqual(4.5)
    },
  )
})
