import type { MapCardFeature } from '@/definitions/interfaces/MapData'

// «Cosa si può fare qui» files every place under an activity (spec
// cosa-fare.md Part −1, D4) — the same words as /benvenuto's intents, so the
// page and the front door speak one vocabulary. A frontend constant in v1: it
// becomes a foreign key from Genre to Intent the day the backend needs the
// grouping (Part I §4). The ninth genre, luogo-naturale (2026-10-23), came by
// a migration and is mapped here like the other eight.

export const GENRE_INTENT: Record<string, string> = {
  spiaggia: 'mare',
  castello: 'citta',
  monumento: 'citta',
  'luogo-storico': 'citta',
  // A cave, a rock, a hill: seen like a viewpoint (2026-10-23).
  'luogo-naturale': 'citta',
  museo: 'citta',
  // «Camminare» was an intent of its own until 2026-10-26, when the author
  // folded it into «Scoprire la città»: viewpoints, walks and parks are the
  // town's too (the review's «Decisioni del 26 ottobre 2026»).
  'punto-panoramico': 'citta',
  'area-per-passeggiate': 'citta',
  parco: 'citta',
}

// A business is filed by its kind (ADR-0010): «Bere» for where one drinks, and
// «Mangiare» for a table and for a bottega alike — beside the dishes, never in
// their place (a dish and a door are different answers). Closed in code, like
// the kinds themselves.
export const KIND_INTENT: Record<string, string> = {
  beve: 'bere',
  mangia: 'mangiare',
  compra: 'mangiare',
}

// How a row says what a business is, under its activity, is the kinds' own
// words (attivita.models.KIND_CHOICES), so «Mangiare» tells a table from a
// bakery — in the reader's language since review PR-19a, so they live with
// the other words, in lib/i18n/messages/types.ts (`kinds`).

// The intents that have a colour of their own (assets/main.css, review PR-14):
// each card on /benvenuto wears a tint of it. The token, never its hex (D8).
// An intent added in the admin and not given one wears the unknown grey, as a
// card type the SPA does not know yet does on the map. `quando` is not an
// intent: it is the tile of the wizard's «Oggi» and «Questa settimana»
// (review PR-21), measured with the others.
export const TINTED_INTENTS = ['mare', 'citta', 'mangiare', 'bere', 'quando']

export const intentVar = (slug: string): string =>
  `var(${TINTED_INTENTS.includes(slug) ? `--color-intent-${slug}` : '--color-layer-unknown'})`

// Where a genre added in the admin, and not mapped yet, goes: shown, never
// lost — under «Altro da vedere» (lib/i18n/messages/types.ts, `otherIntent`).
export const OTHER_INTENT = 'altro'

// The activity a place belongs under. Churches are part of the town; a
// business goes where its kind leads.
export const intentOf = (feature: Pick<MapCardFeature, 'type' | 'genre' | 'kind'>): string => {
  if (feature.type === 'chiese') return 'citta'
  if (feature.type === 'attivita')
    return (feature.kind && KIND_INTENT[feature.kind]) || OTHER_INTENT
  return (feature.genre && GENRE_INTENT[feature.genre]) || OTHER_INTENT
}

// The rows of the page (D3): the places one goes to. A zone's count is of
// these, as the API's is (`maps.ZONE_PLACE_TYPES`).
export const PLACE_TYPES = ['chiese', 'luoghi']

// The businesses (ADR-0010): rows of a zone too, under «Bere» and «Mangiare»,
// but never counted — a zone is not bigger for holding more bars.
export const BUSINESS_TYPES = ['attivita']

// The pseudo-zone for places outside every drawn zone (D2): never dropped —
// «Altrove a Gaeta» (lib/i18n/messages/types.ts, `elsewhere`).
export const ELSEWHERE = 'altrove'

// Alphabetical, in Italian, and printed as such (D5): the one order nobody can
// buy or move.
export const byTitle = <T extends { title: string }>(a: T, b: T): number =>
  a.title.localeCompare(b.title, 'it', { sensitivity: 'base' })
