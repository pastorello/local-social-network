import type { Availability, AvailabilityState } from '@/definitions/interfaces/Content'

// ADR-0008 in the reader's words. Nothing here ever says a place is open: the
// states describe how one gets in, or why one can't, and the hours are a dated
// testimony shown with their date — never parsed, never compared with a clock.

// What the collaborator chooses, in the form.
export const STATE_OPTIONS: { value: AvailabilityState; label: string }[] = [
  { value: 'unknown', label: 'Non lo so' },
  { value: 'services', label: 'Si entra solo durante le funzioni' },
  { value: 'on_request', label: 'Si visita su richiesta' },
  { value: 'works', label: 'Chiuso per lavori' },
  { value: 'no_door', label: "All'aperto, senza porta" },
]

// What the reader is told. `unknown` says nothing at all: printing an absence
// on every card is how an archive apologises instead of informing.
export const STATE_SENTENCE: Record<AvailabilityState, string | null> = {
  unknown: null,
  services: 'Si entra solo durante le funzioni.',
  on_request: 'Si visita su richiesta: chiedi a chi ha le chiavi.',
  works: 'Chiuso per lavori.',
  no_door: "All'aperto: non c'è una porta da trovare chiusa.",
}

export const emptyAvailability = (): Availability => ({
  state: 'unknown',
  hours: '',
  hours_updated: null,
  keeper: '',
  keeper_phone: '',
})

// Whether there is anything at all to show a reader.
export const hasVisitInfo = (availability: Availability | null | undefined): boolean =>
  !!availability &&
  (STATE_SENTENCE[availability.state] !== null ||
    !!availability.hours ||
    !!availability.keeper ||
    !!availability.keeper_phone)

// "2026-03-12" → "12 marzo 2026". The date is a calendar day, not an instant:
// read in UTC so no time zone can move it to the day before.
export const formatDay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, month! - 1, day!)))
}

// A telephone number as a `tel:` link: digits and a leading plus only.
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`
