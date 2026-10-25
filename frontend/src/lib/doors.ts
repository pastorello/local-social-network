import type { Zone } from '@/definitions/interfaces/MapData'

// The ways into the archive that are not the map are the wizard «Cosa fare
// adesso» (review PR-21: /benvenuto and the home, lib/wizard.ts) and «Cosa si
// può fare qui» (/cosa-fare). Each answer is offered only when something is
// behind it, and the zones wait for a published place (cosa-fare.md Part −1,
// D8): no door onto an empty room. The intents' own rule is lib/wizard.ts's
// since the wizard; the zones' is here.

export const zonesWithPlaces = (zones: Zone[]): Zone[] => zones.filter((zone) => zone.count > 0)

// A door's second line: what is behind it, by name — the first two (what one
// line holds on a phone), in the order the author gave them, and an ellipsis
// when there are more. Only names that passed the rules above are passed in,
// so the line never promises a zone with nothing in it.
export const previewNames = (names: string[], max = 2): string =>
  names.slice(0, max).join(' · ') + (names.length > max ? '…' : '')
