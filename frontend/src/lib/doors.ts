// The ways into the archive that are not the map are the wizard «Cosa fare
// adesso» (review PR-21: the home and the map, lib/wizard.ts) and «Cosa si
// può fare qui» (/cosa-fare). Each answer is offered only when something is
// behind it (cosa-fare.md Part −1, D8): no door onto an empty room — the
// rule is lib/wizard.ts's since the wizard. The wizard's own door to the
// zones, «Oppure guarda cosa c'è in una zona», left its first step on
// 2026-10-26 (the author's decision): «Cosa fare» in the menu is that door.

// A door's second line: what is behind it, by name — the first two (what one
// line holds on a phone), in the order the author gave them, and an ellipsis
// when there are more. Only names that passed the rules above are passed in,
// so the line never promises a zone with nothing in it.
export const previewNames = (names: string[], max = 2): string =>
  names.slice(0, max).join(' · ') + (names.length > max ? '…' : '')
