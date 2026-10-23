import type { RouteLocationNormalizedLoaded } from 'vue-router'

import { itinerarioConfig, typeConfigs } from '@/definitions/typeConfigs'

// Close, up, back (review PR-22, spec/design.md "Close, up, back"): three
// actions, and none of them imitates the browser's history. This is *up* — one
// level above the page the reader is on, which is all there is: the archive is
// at most two deep. A card is under its type's list, a stop under its tour, a
// tour under the tours, a chosen zone under «Cosa fare». A page with nothing
// above it but the map has no up: its close button already goes there.
export interface Parent {
  to: string
  label: string
}

// The route the reader is on — or one resolved from a path, whose name may be
// null.
export type Where = Pick<RouteLocationNormalizedLoaded, 'path' | 'query'> & {
  name?: RouteLocationNormalizedLoaded['name'] | null
}

// Every card type's list, and the pages under it: a card, and the form that
// writes one. Feste keeps views of its own, so it has no config to read.
const LISTS = [
  { label: 'Feste', path: '/feste', children: ['festedetail', 'festecreate'] },
  ...[...typeConfigs, itinerarioConfig].map((config) => ({
    label: config.label,
    path: `/${config.key}`,
    children: [config.routeNames.detail, config.routeNames.create],
  })),
]

export const parentOf = (route: Where): Parent | null => {
  // A stop of a tour followed one at a time (`?tappa=N`, itinerari.md I7) is
  // under its tour: the same page, without the query.
  const step = Number(route.query.tappa)
  if (route.name === itinerarioConfig.routeNames.detail && Number.isInteger(step) && step >= 1) {
    return { to: route.path, label: 'Itinerario' }
  }
  if (route.name === 'cosafare' && route.query.zona) {
    return { to: '/cosa-fare', label: 'Cosa fare' }
  }
  // A report is a point on the collaborator's map (reports-and-polls.md R1).
  if (route.name === 'reportdetail') return { to: '/', label: 'Mappa' }

  const list = LISTS.find((candidate) => candidate.children.includes(String(route.name)))
  return list ? { to: list.path, label: list.label } : null
}
