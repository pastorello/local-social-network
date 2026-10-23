import type { MapCardFeature } from '@/definitions/interfaces/MapData'

// «Cosa si può fare qui» files every place under an activity (spec
// cosa-fare.md Part −1, D4) — the same words as /benvenuto's intents, so the
// page and the front door speak one vocabulary. A frontend constant in v1: it
// becomes a foreign key from Genre to Intent the day a ninth genre exists or
// the backend needs the grouping (Part I §4).

export const GENRE_INTENT: Record<string, string> = {
  spiaggia: 'mare',
  castello: 'citta',
  monumento: 'citta',
  'luogo-storico': 'citta',
  museo: 'citta',
  'punto-panoramico': 'camminare',
  'area-per-passeggiate': 'camminare',
  parco: 'camminare',
}

// The intents that have a colour of their own (assets/main.css, review PR-14):
// each card on /benvenuto wears a tint of it. The token, never its hex (D8).
// An intent added in the admin and not given one wears the unknown grey, as a
// card type the SPA does not know yet does on the map.
export const TINTED_INTENTS = ['mare', 'citta', 'mangiare', 'camminare']

export const intentVar = (slug: string): string =>
  `var(${TINTED_INTENTS.includes(slug) ? `--color-intent-${slug}` : '--color-layer-unknown'})`

// Where a genre added in the admin, and not mapped yet, goes: shown, never lost.
export const OTHER_INTENT = 'altro'
export const OTHER_INTENT_NAME = 'Altro da vedere'

// The activity a place belongs under. Churches are part of the town.
export const intentOf = (feature: Pick<MapCardFeature, 'type' | 'genre'>): string => {
  if (feature.type === 'chiese') return 'citta'
  return (feature.genre && GENRE_INTENT[feature.genre]) || OTHER_INTENT
}

// The rows of the page (D3): the places one goes to.
export const PLACE_TYPES = ['chiese', 'luoghi']

// The pseudo-zone for places outside every drawn zone (D2): never dropped.
export const ELSEWHERE = 'altrove'
export const ELSEWHERE_NAME = 'Altrove a Gaeta'

// Alphabetical, in Italian, and printed as such (D5): the one order nobody can
// buy or move.
export const byTitle = <T extends { title: string }>(a: T, b: T): number =>
  a.title.localeCompare(b.title, 'it', { sensitivity: 'base' })
