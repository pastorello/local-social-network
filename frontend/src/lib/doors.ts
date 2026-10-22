import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { Zone } from '@/definitions/interfaces/MapData'

// The two ways into the archive that are not the map: «Che cosa ti va di
// fare?» (/benvenuto, spec itinerari.md I6) and «Cosa si può fare qui»
// (/cosa-fare). Each is offered only when something is behind it — an intent
// with no tour is not a choice, and the zones wait for a published place
// (cosa-fare.md Part −1, D8): no door onto an empty room. /benvenuto and the
// home both read these two rules, so they cannot disagree about it.

export const intentsWithTours = (intents: Intent[]): Intent[] =>
  intents.filter((intent) => intent.count > 0)

export const zonesWithPlaces = (zones: Zone[]): Zone[] => zones.filter((zone) => zone.count > 0)

// A door's second line: what is behind it, by name — the first two (what one
// line holds on a phone), in the order the author gave them, and an ellipsis
// when there are more. Only names that passed the rules above are passed in,
// so the line never promises a zone with nothing in it.
export const previewNames = (names: string[], max = 2): string =>
  names.slice(0, max).join(' · ') + (names.length > max ? '…' : '')
