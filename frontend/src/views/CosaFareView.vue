<script setup lang="ts">
import axios from 'axios'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'

import MainTitle from '@/components/typography/MainTitle.vue'
import { useIsDesktop } from '@/composables/useBreakpoint'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePanelTrail } from '@/composables/usePanelTrail'
import type { Genre } from '@/definitions/interfaces/Luogo'
import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { MapCardFeature, Zone } from '@/definitions/interfaces/MapData'
import { STATE_SENTENCE } from '@/lib/availability'
import {
  ELSEWHERE,
  ELSEWHERE_NAME,
  OTHER_INTENT,
  OTHER_INTENT_NAME,
  PLACE_TYPES,
  byTitle,
  intentOf,
} from '@/lib/intents'
import { layerRoute } from '@/lib/mapLayers'
import { useMapStore } from '@/stores/map'

// «Cosa si può fare qui» — spec cosa-fare.md Part −1. A zone and what is in
// it, by activity: no day, no time (D1); editorial zones, joined by position
// (D2); places as rows, tours and feste as blocks, the dishes for all of
// Gaeta (D3); alphabetical, and saying so (D5). It composes the map's own
// payload with six short lists; it never ranks, and it never says a place is
// open (ADR-0008). The zone's own blocks come first and the dishes last
// (2026-10-23, review PR-4).

interface Row {
  id: string
  title: string
}
interface TourRow extends Row {
  zones: string[]
}
interface FestaRow extends Row {
  recurrence: string
}
interface Page<T> {
  results: T[]
}

const route = useRoute()
const mapStore = useMapStore()
const { isDesktop } = useIsDesktop()

const zones = ref<Zone[]>([])
const intents = ref<Intent[]>([])
const genres = ref<Genre[]>([])
const tours = ref<TourRow[]>([])
const feste = ref<FestaRow[]>([])
const ricette = ref<Row[]>([])
const loaded = ref(false)
const failed = ref(false)

const ALL = { params: { page_size: 100 } }

onMounted(async () => {
  if (!mapStore.loaded) mapStore.load()
  const results = await Promise.allSettled([
    axios.get<Zone[]>('/api/map/zone/'),
    axios.get<Intent[]>('/api/itinerari/intenti/'),
    axios.get<Genre[]>('/api/luoghi/generi/'),
    axios.get<Page<TourRow>>('/api/itinerari/', ALL),
    axios.get<Page<FestaRow>>('/api/feste/', ALL),
    axios.get<Page<Row>>('/api/ricette/', ALL),
  ])
  const value = <T,>(result: PromiseSettledResult<{ data: T }>, fallback: T): T =>
    result.status === 'fulfilled' ? result.value.data : ((failed.value = true), fallback)
  zones.value = value(results[0], [])
  intents.value = value(results[1], [])
  genres.value = value(results[2], [])
  tours.value = value(results[3], { results: [] }).results
  feste.value = value(results[4], { results: [] }).results
  ricette.value = value(results[5], { results: [] }).results.slice().sort(byTitle)
  loaded.value = true
})

const places = computed(() =>
  mapStore.features.filter((feature) => PLACE_TYPES.includes(feature.type)),
)
const inZone = (zoneSlugs: string[], slug: string): boolean =>
  slug === ELSEWHERE ? zoneSlugs.length === 0 : zoneSlugs.includes(slug)

// The chips: every drawn zone, and — only when something is outside them all —
// «Altrove a Gaeta», so nothing the archive holds is unreachable from here.
const elsewhereCount = computed(() => places.value.filter((p) => p.zones.length === 0).length)
// A zone's count is of published places (what the public is told, map.md
// M5); the reader's own drafts are added here only, so a zone that holds
// nothing but their drafts can still be opened by them.
const draftsIn = (slug: string) =>
  places.value.filter((p) => !p.is_published && p.zones.includes(slug)).length
const chips = computed(() => [
  ...zones.value.map((zone) => ({
    slug: zone.slug,
    name: zone.name,
    count: zone.count + draftsIn(zone.slug),
  })),
  ...(elsewhereCount.value
    ? [{ slug: ELSEWHERE, name: ELSEWHERE_NAME, count: elsewhereCount.value }]
    : []),
])

const selected = computed(() => {
  const slug = typeof route.query.zona === 'string' ? route.query.zona : ''
  return chips.value.find((chip) => chip.slug === slug) ?? null
})

// A chosen zone is where the reader stands, under «Cosa fare» — the panel's
// way up (review PR-23): «Cosa fare · Serapo» over the title, and in the
// window's title too.
usePanelTrail(() => (selected.value ? { steps: [{ label: selected.value.name }] } : null))
usePageTitle(() => (selected.value ? [selected.value.name, 'Cosa fare'] : null))

const placesHere = computed(() =>
  selected.value ? places.value.filter((p) => inZone(p.zones, selected.value!.slug)) : [],
)
const festeHere = computed<(MapCardFeature & { recurrence: string })[]>(() => {
  if (!selected.value) return []
  const recurrence = new Map(feste.value.map((festa) => [festa.id, festa.recurrence]))
  return mapStore.features
    .filter((f) => f.type === 'feste' && inZone(f.zones, selected.value!.slug))
    .map((f) => ({ ...f, recurrence: recurrence.get(f.id) ?? '' }))
    .sort(byTitle)
})
const toursHere = computed(() =>
  selected.value
    ? tours.value.filter((tour) => inZone(tour.zones, selected.value!.slug)).sort(byTitle)
    : [],
)

const genreName = computed(() => new Map(genres.value.map((g) => [g.slug, g.name])))
const kindOf = (place: MapCardFeature): string =>
  place.type === 'chiese' ? 'Chiesa' : (genreName.value.get(place.genre ?? '') ?? 'Luogo')

// One row of the page, whatever it lists: a place, a tour, a festa, a dish.
interface Line {
  id: string
  title: string
  to: RouteLocationRaw
  detail?: string
  draft?: boolean
}
interface Block {
  key: string
  name: string
  rows: Line[]
  // Places are what the page is for (D3): their names carry the weight.
  places?: boolean
  note?: string
}

const placeLine = (place: MapCardFeature): Line => {
  const access = place.access ? STATE_SENTENCE[place.access] : null
  return {
    id: place.id,
    title: place.title,
    to: layerRoute(place.type, place.id),
    detail: access ? `${kindOf(place)} · ${access}` : kindOf(place),
    draft: !place.is_published,
  }
}

// The blocks, top to bottom (review PR-4, 2026-10-23). First what is in this
// zone: its places by activity, in the author's order of intents (D4), with a
// genre nobody has mapped yet under «Altro da vedere» rather than nowhere; then
// its tours and its feste. *Mangiare* comes last, because it is not this
// zone's: the dishes are for all of Gaeta (D3), and ahead of the zone's own
// places they answered a question nobody had asked.
const blocks = computed<Block[]>(() => {
  if (!selected.value) return []
  const list: Block[] = []
  for (const intent of intents.value) {
    if (intent.slug === 'mangiare') continue
    const rows = placesHere.value.filter((p) => intentOf(p) === intent.slug).sort(byTitle)
    if (rows.length)
      list.push({ key: intent.slug, name: intent.name, rows: rows.map(placeLine), places: true })
  }
  const known = new Set(intents.value.map((intent) => intent.slug))
  const other = placesHere.value.filter((p) => {
    const intent = intentOf(p)
    return intent === OTHER_INTENT || !known.has(intent)
  })
  if (other.length)
    list.push({
      key: OTHER_INTENT,
      name: OTHER_INTENT_NAME,
      rows: other.sort(byTitle).map(placeLine),
      places: true,
    })
  if (toursHere.value.length)
    list.push({
      key: 'itinerari',
      name: 'Itinerari che passano di qui',
      rows: toursHere.value.map((tour) => ({
        id: tour.id,
        title: tour.title,
        to: { name: 'itinerariodetail', params: { id: tour.id } },
      })),
    })
  if (festeHere.value.length)
    list.push({
      key: 'feste',
      name: 'Le feste di questa zona',
      rows: festeHere.value.map((festa) => ({
        id: festa.id,
        title: festa.title,
        to: layerRoute('feste', festa.id),
        detail: festa.recurrence,
      })),
    })
  const mangiare = intents.value.find((intent) => intent.slug === 'mangiare')
  if (mangiare && ricette.value.length)
    list.push({
      key: 'mangiare',
      name: mangiare.name,
      note: 'Le ricette non stanno in una zona sola: queste valgono per tutta Gaeta.',
      rows: ricette.value.map((ricetta) => ({
        id: ricetta.id,
        title: ricetta.title,
        to: layerRoute('ricette', ricetta.id),
      })),
    })
  return list
})

const emptyHere = computed(
  () =>
    !!selected.value &&
    !placesHere.value.length &&
    !festeHere.value.length &&
    !toursHere.value.length,
)
const zonesWithSomething = computed(() => chips.value.filter((chip) => chip.count > 0))

// The map draws exactly this page's set (D5): the zone's places and feste.
watch(
  () => (selected.value ? [...placesHere.value, ...festeHere.value].map((f) => f.id) : null),
  (ids) => mapStore.setRestriction(ids),
  { immediate: true },
)

// …and frames it, in the part of the map the panel leaves free (2026-10-23,
// review PR-4): with a zone chosen, that zone's set — or, when it holds
// nothing yet, the zone's own outline, so the reader still sees where it is;
// with none, every zone's outline, which is the whole of Gaeta. Handed over as
// the two corners of the box, since that is all a frame needs.
const outline = (geometry: Zone['geometry'] | undefined): { lat: number; lng: number }[] => {
  if (!geometry) return []
  const polygons = (
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  ) as number[][][][]
  return polygons.flat(2).map(([lng, lat]) => ({ lat: lat!, lng: lng! }))
}
const corners = (points: { lat: number; lng: number }[]) => {
  if (!points.length) return null
  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)
  return [
    { lat: Math.min(...lats), lng: Math.min(...lngs) },
    { lat: Math.max(...lats), lng: Math.max(...lngs) },
  ]
}
const frame = computed(() => {
  if (!selected.value) return corners(zones.value.flatMap((zone) => outline(zone.geometry)))
  const slug = selected.value.slug
  const set = [...placesHere.value, ...festeHere.value].flatMap((f) => [...f.points, ...f.route])
  return corners(set) ?? corners(outline(zones.value.find((zone) => zone.slug === slug)?.geometry))
})
watch(frame, (points) => mapStore.setFrame(points), { immediate: true })

onBeforeUnmount(() => {
  mapStore.setRestriction(null)
  mapStore.setFrame(null)
})

// On a phone the chips are one row that scrolls sideways, and once a zone is
// chosen they step aside for it: the chosen one, and «Cambia zona» to bring
// the others back (review PR-4). Choosing — or the address changing under
// the page, by Back — puts them away again.
const choosing = ref(false)
watch(
  () => selected.value?.slug,
  () => (choosing.value = false),
)
const collapsed = computed(() => !isDesktop.value && !!selected.value && !choosing.value)
const shownChips = computed(() =>
  collapsed.value ? chips.value.filter((chip) => chip.slug === selected.value?.slug) : chips.value,
)
</script>

<template>
  <article class="mx-auto w-full max-w-2xl pt-2">
    <!-- «A Gaeta» until a zone is chosen; then the panel's eyebrow says which
    (review PR-23), and one eyebrow is enough. -->
    <p v-if="!selected" class="text-xs font-semibold tracking-[0.12em] text-terracotta uppercase">
      A Gaeta
    </p>
    <MainTitle>Cosa si può fare qui</MainTitle>
    <!-- One line on a phone, where the results have to start on the first
    screen (review PR-4, M-07). -->
    <p class="mt-2 max-w-[55ch] text-reading text-muted">
      {{
        isDesktop
          ? 'Scegli una zona: trovi i luoghi da vedere, gli itinerari che ci passano e le feste che la attraversano.'
          : 'Luoghi, itinerari e feste, zona per zona.'
      }}
    </p>

    <nav aria-label="Zone" class="mt-6">
      <!-- On a phone the open row runs to the panel's edges, so it reads as a
      row that scrolls, and «Cambia zona» goes under it. -->
      <div class="flex flex-wrap items-center gap-2">
        <ul
          id="zone-chips"
          class="flex gap-2"
          :class="
            isDesktop
              ? 'flex-wrap'
              : collapsed
                ? ''
                : '-mx-4 -my-1 w-[calc(100%+2rem)] flex-none snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 py-1'
          "
        >
          <li v-for="chip in shownChips" :key="chip.slug" class="flex-none snap-start">
            <RouterLink
              :to="{ query: { zona: chip.slug } }"
              :aria-current="selected?.slug === chip.slug ? 'page' : undefined"
              class="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              :class="
                selected?.slug === chip.slug
                  ? 'border-sea bg-sea text-white'
                  : 'border-field bg-surface text-ink hover:border-sea'
              "
              @click="choosing = false"
            >
              {{ chip.name }}
              <span :class="selected?.slug === chip.slug ? 'text-white' : 'text-muted'">{{
                chip.count
              }}</span>
            </RouterLink>
          </li>
        </ul>
        <button
          v-if="!isDesktop && selected"
          type="button"
          aria-controls="zone-chips"
          :aria-expanded="!collapsed"
          class="inline-flex h-10 flex-none cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-sea underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
          @click="choosing = !choosing"
        >
          Cambia zona
          <svg
            viewBox="0 0 20 20"
            class="h-4 w-4 transition-transform"
            :class="{ 'rotate-180': !collapsed }"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5.5 8l4.5 4.5L14.5 8" />
          </svg>
        </button>
      </div>
      <p class="mt-3 text-sm text-muted">Zone indicative, non confini ufficiali.</p>
    </nav>

    <p v-if="failed" class="mt-6 text-ink" role="status">
      Una parte dell'archivio non si è caricata: quello che vedi potrebbe essere incompleto.
    </p>

    <template v-if="selected">
      <p v-if="emptyHere" class="mt-8 text-ink">
        In questa zona l'archivio non ha ancora niente.
        <template v-if="zonesWithSomething.length">
          Prova
          <template v-for="(chip, index) in zonesWithSomething" :key="chip.slug">
            <RouterLink :to="{ query: { zona: chip.slug } }" class="text-sea underline">{{
              chip.name
            }}</RouterLink
            >{{ index < zonesWithSomething.length - 1 ? ', ' : '.' }}
          </template>
        </template>
      </p>

      <section v-for="block in blocks" :key="block.key" class="mt-8">
        <!-- The order is said where it applies, beside each heading (D5). -->
        <div class="mb-3 flex flex-wrap items-baseline gap-x-2">
          <h2 class="font-display text-title text-ink">{{ block.name }}</h2>
          <p class="text-sm text-muted"><span aria-hidden="true">·</span> in ordine alfabetico</p>
        </div>
        <p v-if="block.note" class="mb-3 text-sm text-muted">{{ block.note }}</p>
        <ul class="divide-y divide-hairline border-y border-hairline">
          <li v-for="row in block.rows" :key="row.id" class="py-3">
            <RouterLink
              :to="row.to"
              class="text-ink underline"
              :class="{ 'font-semibold': block.places }"
              >{{ row.title }}</RouterLink
            ><span v-if="row.draft" class="text-xs text-muted"> · bozza</span>
            <p v-if="row.detail" class="text-sm text-muted">{{ row.detail }}</p>
          </li>
        </ul>
      </section>
    </template>
    <p v-else-if="loaded" class="mt-8 text-muted">Scegli una zona per vedere cosa c'è.</p>

    <p class="mt-10 border-t border-hairline pt-4 text-sm text-muted">
      Questo è quello che c'è in archivio, non tutto quello che succede a Gaeta. Gli orari, quando
      li conosciamo, sono sulla scheda di ogni luogo, con la data in cui ce li hanno detti.
    </p>
  </article>
</template>
