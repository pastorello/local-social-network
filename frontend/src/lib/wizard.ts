import type { RouteLocationRaw } from 'vue-router'

import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { MapCardFeature, Zone } from '@/definitions/interfaces/MapData'
import { previewNames } from '@/lib/doors'
import { BUSINESS_TYPES, PLACE_TYPES, byTitle, intentOf } from '@/lib/intents'

// «Cosa fare adesso» (review of 2026-10-22, study 10; the flow confirmed by
// the author on 2026-10-23): /benvenuto and /cosa-fare in a row, one question
// a screen. What (step 1, /benvenuto), where (step 2, /benvenuto?intento=),
// and what there is (step 3, /cosa-fare?intento=&zona=). The answers live in
// the address, so Back is the step before and a link reopens the same result.
// Its rules are here, out of the components, so that a test holds them:
// - an answer appears only when something is behind it — lib/doors.ts's «no
//   door onto an empty room», for every answer, and counted on what the
//   public can read (map.md M5): a collaborator's drafts never open one;
// - a step with one possible answer is skipped;
// - nothing here says a place is open (ADR-0008), and nothing asks how much
//   time there is: a tour's duration is its author's words (cosa-fare.md
//   Part −1, D1).

// A tour as /api/itinerari/ lists it, as far as the wizard reads it.
export interface WizardTour {
  id: string
  title: string
  intents: string[]
  zones: string[]
}

export interface WizardArchive {
  // In the admin's order, each with its published tours counted (I5).
  intents: Intent[]
  // The map's features (/api/map/features/), which hold a collaborator's own
  // drafts too; only the published ones answer.
  features: MapCardFeature[]
  tours: WizardTour[]
  // How many ricette are published: the dishes are for all of Gaeta (D3),
  // so they answer «Mangiare» in every zone and in none.
  dishes: number
}

export const MANGIARE = 'mangiare'

// The rows «Cosa si può fare qui» files under an activity: its places and its
// businesses (D4, ADR-0010).
const ROW_TYPES = [...PLACE_TYPES, ...BUSINESS_TYPES]

export const intentRows = (features: MapCardFeature[], slug: string): MapCardFeature[] =>
  features.filter(
    (feature) =>
      feature.is_published && ROW_TYPES.includes(feature.type) && intentOf(feature) === slug,
  )

export const intentTours = (tours: WizardTour[], slug: string): WizardTour[] =>
  tours.filter((tour) => tour.intents.includes(slug))

const counted = (count: number, one: string, many: string): string =>
  count === 1 ? `1 ${one}` : `${count} ${many}`

// What is behind an answer, in a line: «2 luoghi · 1 itinerario».
export const contentLine = (rows: number, tours: number, dishes = 0): string =>
  [
    rows ? counted(rows, 'luogo', 'luoghi') : '',
    tours ? counted(tours, 'itinerario', 'itinerari') : '',
    dishes ? counted(dishes, 'ricetta', 'ricette') : '',
  ]
    .filter(Boolean)
    .join(' · ')

export interface IntentAnswer extends Intent {
  line: string
}

// Step 1: the intents with something behind them — a published tour, a place
// or a business filed under them, and for «Mangiare» a dish. «Bere» answers
// only once a business *dove si beve* is published (decided 2026-10-23).
export const intentAnswers = (archive: WizardArchive): IntentAnswer[] =>
  archive.intents.flatMap((intent) => {
    const rows = intentRows(archive.features, intent.slug).length
    const dishes = intent.slug === MANGIARE ? archive.dishes : 0
    if (!rows && !intent.count && !dishes) return []
    return [{ ...intent, line: contentLine(rows, intent.count, dishes) }]
  })

export interface ZoneAnswer {
  slug: string
  name: string
  // What of the intent is there, by name — the first two, as a door says it.
  line: string
}

// Step 2: the zones holding something of the intent — a row by its pin, a
// tour by D2's rule (where a percorso starts, wherever a raccolta stops), as
// the API gives it — in the admin's order of the zones.
export const zoneAnswers = (
  archive: WizardArchive,
  slug: string,
  zones: Pick<Zone, 'slug' | 'name'>[],
): ZoneAnswer[] => {
  const rows = intentRows(archive.features, slug).sort(byTitle)
  const tours = intentTours(archive.tours, slug).sort(byTitle)
  return zones.flatMap((zone) => {
    const names = [...rows, ...tours]
      .filter((item) => item.zones.includes(zone.slug))
      .map((item) => item.title)
    return names.length ? [{ slug: zone.slug, name: zone.name, line: previewNames(names) }] : []
  })
}

// Something of the intent in no zone at all — a place outside every outline
// (D2's «Altrove a Gaeta»): only «Ovunque a Gaeta» shows it.
const outsideEveryZone = (archive: WizardArchive, slug: string): boolean =>
  [...intentRows(archive.features, slug), ...intentTours(archive.tours, slug)].some(
    (item) => !item.zones.length,
  )

// Step 3: «Cosa si può fare qui» opened on the intent, in a zone or — with
// none — anywhere in Gaeta.
export const resultOf = (intent: string, zone?: string | null): RouteLocationRaw => ({
  name: 'cosafare',
  query: zone ? { intento: intent, zona: zone } : { intento: intent },
})

export const zoneStepOf = (intent: string): RouteLocationRaw => ({
  name: 'benvenuto',
  query: { intento: intent },
})

// Whether step 2 has more than one answer to offer. When it has one, choosing
// the intent leads straight to that answer: «Ovunque a Gaeta» when no zone
// holds anything of it (the dishes are in none), the one zone that holds all
// of it otherwise — «Ovunque» would show the same.
export const asksWhere = (
  archive: WizardArchive,
  slug: string,
  zones: Pick<Zone, 'slug' | 'name'>[],
): boolean => {
  const answers = zoneAnswers(archive, slug, zones)
  return answers.length > 1 || (answers.length === 1 && outsideEveryZone(archive, slug))
}

// Where choosing an intent leads: step 2, or step 3 when step 2 would have
// one answer only.
export const afterIntent = (
  archive: WizardArchive,
  slug: string,
  zones: Pick<Zone, 'slug' | 'name'>[],
): RouteLocationRaw => {
  if (asksWhere(archive, slug, zones)) return zoneStepOf(slug)
  return resultOf(slug, zoneAnswers(archive, slug, zones)[0]?.slug)
}

// «Oggi» and «Questa settimana» (cosa-fare.md Part −1, D9): what falls on
// those days, light events and feasts' editions together, counted by the API
// in Gaeta's day. Each answers only when something falls in its window, and
// leads to «Gli eventi che conosciamo» — never merged with the cards (CF42).
export type EventWindow = 'oggi' | 'settimana'

export interface WindowAnswer {
  key: EventWindow
  name: string
  description: string
  line: string
}

const WINDOWS: { key: EventWindow; name: string; description: string }[] = [
  { key: 'oggi', name: 'Oggi', description: 'Eventi e feste di oggi' },
  {
    key: 'settimana',
    name: 'Questa settimana',
    description: 'Eventi e feste da oggi ai prossimi sei giorni',
  },
]

export const windowAnswers = (counts: Record<EventWindow, number>): WindowAnswer[] =>
  WINDOWS.flatMap((window) =>
    counts[window.key] > 0
      ? [{ ...window, line: counted(counts[window.key], 'evento', 'eventi') }]
      : [],
  )
