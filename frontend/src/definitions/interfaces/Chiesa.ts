import type { Availability, CardBase, MapPoint } from './Content'

export default interface Chiesa extends CardBase {
  pins: MapPoint[]
  // «Se la trovi chiusa» (cosa-fare.md D7) — this card's own, per language.
  from_outside: string
  // The original's, in every language (ADR-0008, T5).
  availability: Availability
}
