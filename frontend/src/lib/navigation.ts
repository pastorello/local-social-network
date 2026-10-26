import type { RouteLocationNormalizedLoaded } from 'vue-router'

import { itinerarioConfig, typeConfigs } from '@/definitions/typeConfigs'
import shell from '@/lib/i18n/messages/shell'
import { wordsOf } from '@/lib/i18n/messages/types'
import { CARD_LAYERS, layerVar } from '@/lib/mapLayers'

// Close, up, back (review PR-22, spec/design.md "Close, up, back"): three
// actions, and none of them imitates the browser's history. This is *up* — one
// level above the page the reader is on, which is all there is: the archive is
// at most two deep. A card is under its type's list, a stop under its tour, a
// tour under the tours, a chosen zone under «Cosa fare». A page with nothing
// above it but the map has no up: its close button already goes there. Named
// in the reader's language (review PR-19a): read where it is drawn, so the
// label follows the switch.
export interface Parent {
  to: string
  label: string
}

// The route the reader is on — or one resolved from a path, whose name may be
// null.
export type Where = Pick<RouteLocationNormalizedLoaded, 'path' | 'query'> & {
  name?: RouteLocationNormalizedLoaded['name'] | null
  params?: RouteLocationNormalizedLoaded['params']
}

// Every card type's list, and the pages under it: a card, and the form that
// writes one. Feste keeps views of its own, so it has no config to read.
const LISTS = [
  { key: 'feste', path: '/feste', name: 'festelist', children: ['festedetail', 'festecreate'] },
  ...[...typeConfigs, itinerarioConfig].map((config) => ({
    key: config.key,
    path: `/${config.key}`,
    name: config.routeNames.list,
    children: [config.routeNames.detail, config.routeNames.create],
  })),
]

export const parentOf = (route: Where): Parent | null => {
  const up = shell().up
  // A stop of a tour followed one at a time (`?tappa=N`, itinerari.md I7) is
  // under its tour: the same page, without the query.
  const step = Number(route.query.tappa)
  if (route.name === itinerarioConfig.routeNames.detail && Number.isInteger(step) && step >= 1) {
    return { to: route.path, label: up.tour }
  }
  // A chosen zone, or the wizard's answer shown there (review PR-21), is under
  // «Cosa fare» itself.
  if (route.name === 'cosafare' && (route.query.zona || route.query.intento)) {
    return { to: '/cosa-fare', label: up.whatToDo }
  }
  // A report is a point on the collaborator's map (reports-and-polls.md R1),
  // where the reports are: up is named after them (review PR-23).
  if (route.name === 'reportdetail') return { to: '/mappa', label: up.reports }
  // An event is not a card (cosa-fare.md CF25), but it has a list of its
  // own, «Gli eventi che conosciamo», and its form is under its page.
  if (route.name === 'eventodetail' || route.name === 'eventocreate') {
    return { to: '/eventi', label: up.events }
  }
  if (route.name === 'eventoedit') return { to: `/eventi/${route.params?.id}`, label: up.event }

  const list = LISTS.find((candidate) => candidate.children.includes(String(route.name)))
  return list ? { to: list.path, label: wordsOf(list.key)?.label ?? list.key } : null
}

// The eyebrow wears the colour of its type's map layer (review PR-23,
// design.md D6/D7): the one saturated register, here doing the same work it
// does on the map — this is a church, that a festa. A page under no layer — a
// tour, «Cosa fare», a report, the types with no place — keeps the
// terracotta every eyebrow had. Read through the layer's route segment, which
// is its key (lib/mapLayers.ts). Each one clears 4.5:1 on the panel's ground.
export const tintOf = (parent: Parent | null): string => {
  const key = parent?.to.split('/')[1] ?? ''
  return CARD_LAYERS.some((layer) => layer.key === key) ? layerVar(key) : 'var(--color-terracotta)'
}

// Where the reader is, for the menu (review PR-23, N-02): the item above the
// page they are on, which the pill marks as current. A card type, its list
// and its form are under the menu that lists it — *Esplora* for the places,
// the tours and the businesses, *Tradizioni* for the feasts, the dishes, the
// people, the dialect and the books (2026-10-26; the tours were a pill item
// of their own until then); the map itself (/mappa since 2026-10-26) and a
// report under *Mappa*, a report as a point on the collaborator's map. Pages
// under none of them — the home, which is the welcome page (decided by the
// author on 2026-10-23, review PR-25, and again on 2026-10-26), the
// account's — mark nothing.
export type MenuSection = 'esplora' | 'tradizioni'
export type Section = 'mappa' | MenuSection | 'cosa-fare' | 'progetto'

// The types *Tradizioni* lists (components/buttons/SchedeMenu.vue); every
// other type is *Esplora*'s — churches with the places.
export const TRADIZIONI = ['feste', 'ricette', 'personaggi', 'dialetto', 'libri']

export const sectionOf = (route: Pick<Where, 'name'>): Section | null => {
  const name = String(route.name)
  if (name === 'mappa' || name === 'reportdetail') return 'mappa'
  if (name === 'cosafare') return 'cosa-fare'
  if (name === 'progetto') return 'progetto'
  const list = LISTS.find((candidate) => [candidate.name, ...candidate.children].includes(name))
  if (!list) return null
  return TRADIZIONI.includes(list.key) ? 'tradizioni' : 'esplora'
}
