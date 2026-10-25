import type { Availability, AvailabilityState } from '@/definitions/interfaces/Content'
import { intlLocale } from '@/lib/i18n'
import visit from '@/lib/i18n/messages/visit'

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

// What the reader is told, in the reader's language (review PR-19a: the
// sentences are lib/i18n/messages/visit.ts's, read when they are asked for).
// `unknown` says nothing at all: printing an absence on every card is how an
// archive apologises instead of informing.
export const STATE_SENTENCE: Record<AvailabilityState, string | null> = {
  unknown: null,
  get services() {
    return visit().states.services
  },
  get on_request() {
    return visit().states.on_request
  },
  get works() {
    return visit().states.works
  },
  get no_door() {
    return visit().states.no_door
  },
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

// "2026-03-12" → "12 marzo 2026" ("12 March 2026"). The date is a calendar
// day, not an instant: read in UTC so no time zone can move it to the day
// before. Without its weekday, unlike an event's (CF34): content.md's
// archive's line fixes the words, and the day a place's hours were reported
// is printed the same way, so the two dates a reader meets read alike.
export const formatDay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat(intlLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, month! - 1, day!)))
}

// A telephone number as a `tel:` link: digits and a leading plus only.
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`
