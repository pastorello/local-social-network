import { readToken } from './tokens'

// The reader-toggleable layers of the home map (spec map.md M2): one per
// content type that has a footprint, plus the v1 reports layer. dialetto and
// libri are absent by design — the spec gives them no place, so they are
// reached from the menu instead.
//
// `key` matches both the API's `type` key in /api/map/features/ and the
// card's own route path, so a pin knows where it links without a lookup
// table per type. The colour is a token (spec/design.md D8), read back at
// runtime because Leaflet cannot take a `var()`; each layer's swatch is
// always paired with its label, never the only carrier of meaning (ADR-0005).
export interface MapLayer {
  key: string
  label: string
  token: string
  fallback: string
  route: string
}

export const CARD_LAYERS: MapLayer[] = [
  {
    key: 'chiese',
    label: 'Chiese',
    token: '--color-layer-chiese',
    fallback: '#1d4ed8',
    route: '/chiese',
  },
  {
    key: 'feste',
    label: 'Feste',
    token: '--color-layer-feste',
    fallback: '#b45309',
    route: '/feste',
  },
  {
    key: 'ricette',
    label: 'Ricette (dove si comprano)',
    token: '--color-layer-ricette',
    fallback: '#15803d',
    route: '/ricette',
  },
  {
    key: 'personaggi',
    label: 'Personaggi storici',
    token: '--color-layer-personaggi',
    fallback: '#7e22ce',
    route: '/personaggi',
  },
  {
    key: 'luoghi',
    label: 'Luoghi',
    token: '--color-layer-luoghi',
    fallback: '#be185d',
    route: '/luoghi',
  },
  {
    key: 'attivita',
    label: 'Attività',
    token: '--color-layer-attivita',
    fallback: '#0f766e',
    route: '/attivita',
  },
]

// The layers whose cards can be a tour's stop (spec itinerari.md I3): every
// one but the businesses — a tour that chose one bar among many would be the
// ranking cosa-fare.md CF40 forbids (ADR-0010). A second list on purpose, as
// the backend's `maps.STOP_TYPES` is: when the layers were the stop types too,
// putting a type on the map made it a stop.
export const STOP_TYPES = ['chiese', 'feste', 'ricette', 'personaggi', 'luoghi']

// The cards an event may be held at (cosa-fare.md Part −1 D9, CF41 as amended):
// a place with a door, as the backend's `maps.VENUE_TYPES`. Events themselves
// are no layer (CF25), and a feast is no venue — its date is an edition.
export const VENUE_TYPES = ['luoghi', 'chiese', 'attivita']

export const REPORTS_LAYER_KEY = 'segnalazioni'

export const layerColor = (key: string): string => {
  const layer = CARD_LAYERS.find((candidate) => candidate.key === key)
  return layer
    ? readToken(layer.token, layer.fallback)
    : readToken('--color-layer-unknown', '#6b7280')
}

// The same colour for the DOM, which can take a `var()` and so needs nothing
// read back: the token itself, never the hex it resolves to (D8). A type with
// no layer — itinerari, dialetto, libri — gets the unknown grey, as its pin
// would.
export const layerVar = (key: string): string => {
  const layer = CARD_LAYERS.find((candidate) => candidate.key === key)
  return `var(${layer ? layer.token : '--color-layer-unknown'})`
}

export const layerRoute = (key: string, id: string): string => {
  const layer = CARD_LAYERS.find((candidate) => candidate.key === key)
  return layer ? `${layer.route}/${id}` : '/'
}
