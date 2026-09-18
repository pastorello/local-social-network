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
]

export const REPORTS_LAYER_KEY = 'segnalazioni'

export const layerColor = (key: string): string => {
  const layer = CARD_LAYERS.find((candidate) => candidate.key === key)
  return layer
    ? readToken(layer.token, layer.fallback)
    : readToken('--color-layer-unknown', '#6b7280')
}

export const layerRoute = (key: string, id: string): string => {
  const layer = CARD_LAYERS.find((candidate) => candidate.key === key)
  return layer ? `${layer.route}/${id}` : '/'
}
