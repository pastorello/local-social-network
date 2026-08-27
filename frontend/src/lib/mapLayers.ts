// The reader-toggleable layers of the home map (spec map.md M2): one per
// content type that has a footprint, plus the v1 reports layer. dialetto is
// absent by design — the spec gives it no place, so it is reached from the
// menu instead.
//
// `type` matches both the API's `type` key in /api/map/features/ and the
// card's own route path, so a pin knows where it links without a lookup
// table per type. Colors are the pin fill; each one is paired with its label
// in the legend, never used as the only carrier of meaning (ADR-0005).
export interface MapLayer {
  key: string
  label: string
  color: string
  route: string
}

export const CARD_LAYERS: MapLayer[] = [
  { key: 'chiese', label: 'Chiese', color: '#1d4ed8', route: '/chiese' },
  { key: 'feste', label: 'Feste', color: '#b45309', route: '/feste' },
  { key: 'ricette', label: 'Ricette (dove si comprano)', color: '#15803d', route: '/ricette' },
  { key: 'personaggi', label: 'Personaggi storici', color: '#7e22ce', route: '/personaggi' },
]

export const REPORTS_LAYER_KEY = 'segnalazioni'

export const layerColor = (key: string): string =>
  CARD_LAYERS.find((layer) => layer.key === key)?.color ?? '#6b7280'

export const layerRoute = (key: string, id: string): string => {
  const layer = CARD_LAYERS.find((candidate) => candidate.key === key)
  return layer ? `${layer.route}/${id}` : '/'
}
