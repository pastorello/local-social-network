import type { Availability, CardBase, MapPoint, ZoneRef } from './Content'

// The three kinds, closed in code on both sides (ADR-0010): a fourth is a PR
// and a spec edit, never an admin form — mirrors attivita.models.KIND_CHOICES.
export type AttivitaKind = 'beve' | 'mangia' | 'compra'

// One of them as GET /api/attivita/kinds/ returns it: the list's headings and
// the form's choices, with how many published businesses are of it.
export interface Kind {
  slug: AttivitaKind
  name: string
  name_plural: string
  count: number
}

// A business in the archive, on the editors' merit and never ranked
// (ADR-0010) — mirrors attivita/serializers.py::AttivitaReadSerializer.
export default interface Attivita extends CardBase {
  // A translation shows its original's, as it shows its original's pin.
  kind: AttivitaKind
  kind_label: string
  how_to_get_there: string
  pins: MapPoint[]
  zones: ZoneRef[]
  // The original's, in every language: its hours, dated, and nothing else
  // (ADR-0008, ADR-0010).
  availability: Availability
}
