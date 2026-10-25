<script setup lang="ts">
import axios from 'axios'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import WhereAreYouField from '@/components/forms/WhereAreYouField.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import WizardChoices from '@/components/wizard/WizardChoices.vue'
import { useIsDesktop } from '@/composables/useBreakpoint'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePanelTrail } from '@/composables/usePanelTrail'
import type { Genre } from '@/definitions/interfaces/Luogo'
import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { MapCardFeature, Zone, ZoneAlias } from '@/definitions/interfaces/MapData'
import { STATE_SENTENCE } from '@/lib/availability'
import { localName } from '@/lib/i18n'
import cosaFare from '@/lib/i18n/messages/cosaFare'
import shell from '@/lib/i18n/messages/shell'
import types from '@/lib/i18n/messages/types'
import wizardText from '@/lib/i18n/messages/wizard'
import {
  BUSINESS_TYPES,
  ELSEWHERE,
  OTHER_INTENT,
  PLACE_TYPES,
  byTitle,
  intentOf,
} from '@/lib/intents'
import { layerRoute } from '@/lib/mapLayers'
import { asksWhere, resultOf, zoneAnswers, zoneStepOf, type WizardArchive } from '@/lib/wizard'
import { useMapStore } from '@/stores/map'

// «Cosa si può fare qui» — spec cosa-fare.md Part −1. A zone and what is in
// it, by activity: no day, no time (D1); editorial zones, joined by position
// (D2); places as rows, tours and feste as blocks, the dishes for all of
// Gaeta (D3); alphabetical, and saying so (D5). It composes the map's own
// payload with six short lists; it never ranks, and it never says a place is
// open (ADR-0008). The zone's own blocks come first and the dishes last
// (2026-10-23, review PR-4). Above the chips, «Dove sei?» picks the zone from
// the name of where the guest stands (2026-10-24, review PR-20). A zone's
// businesses are its rows too, under «Bere» and, beside the dishes, under
// «Mangiare» — listed, alphabetically like everything here, and never counted
// (2026-10-25, ADR-0010). And with `?intento=` it is the third step of the
// wizard «Cosa fare adesso» (2026-10-25, review PR-21): the intent's tours
// and its section first and open, the rest of the zone put away — or, with
// no zone, the intent's section alone, anywhere in Gaeta. Its words are the
// reader's language, and so are the names of zones, intents and genres where
// the author wrote them; the cards' own titles are Italian, and marked so
// (review PR-19a).

interface Row {
  id: string
  title: string
}
interface TourRow extends Row {
  zones: string[]
  intents: string[]
}
interface FestaRow extends Row {
  recurrence: string
}
interface Page<T> {
  results: T[]
}

const route = useRoute()
const router = useRouter()
const mapStore = useMapStore()
const { isDesktop } = useIsDesktop()

const zones = ref<Zone[]>([])
const aliases = ref<ZoneAlias[]>([])
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
    axios.get<ZoneAlias[]>('/api/map/zone/alias/'),
  ])
  const value = <T,>(result: PromiseSettledResult<{ data: T }>, fallback: T): T =>
    result.status === 'fulfilled' ? result.value.data : ((failed.value = true), fallback)
  zones.value = value(results[0], [])
  intents.value = value(results[1], [])
  genres.value = value(results[2], [])
  tours.value = value(results[3], { results: [] }).results
  feste.value = value(results[4], { results: [] }).results
  ricette.value = value(results[5], { results: [] }).results.slice().sort(byTitle)
  aliases.value = value(results[6], [])
  loaded.value = true
})

const places = computed(() =>
  mapStore.features.filter((feature) => PLACE_TYPES.includes(feature.type)),
)
const businesses = computed(() =>
  mapStore.features.filter((feature) => BUSINESS_TYPES.includes(feature.type)),
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
    name: localName(zone),
    count: zone.count + draftsIn(zone.slug),
  })),
  ...(elsewhereCount.value
    ? [{ slug: ELSEWHERE, name: types().elsewhere, count: elsewhereCount.value }]
    : []),
])

const selected = computed(() => {
  const slug = typeof route.query.zona === 'string' ? route.query.zona : ''
  return chips.value.find((chip) => chip.slug === slug) ?? null
})

// The wizard's answer to «Che cosa ti va di fare?» (review PR-21), when the
// page is its third step.
const chosenIntent = computed(() => {
  const slug = typeof route.query.intento === 'string' ? route.query.intento : ''
  return intents.value.find((intent) => intent.slug === slug) ?? null
})
// Until the intents have come, the address is all there is to go on, as for
// the zone below: the third step is drawn as one from its first frame.
const intentMode = computed(() => (loaded.value ? !!chosenIntent.value : !!route.query.intento))

// A chosen zone is where the reader stands, under «Cosa fare» — the panel's
// way up (review PR-23): «Cosa fare · Serapo» over the title, and in the
// window's title too. On the wizard's third step what was chosen is said
// once, by «Hai scelto», with the ways to change it; the eyebrow keeps the
// way up.
usePanelTrail(() =>
  !intentMode.value && selected.value ? { steps: [{ label: selected.value.name }] } : null,
)
usePageTitle(() => {
  const page = shell().title.whatToDo
  if (chosenIntent.value)
    return [localName(chosenIntent.value), ...(selected.value ? [selected.value.name] : []), page]
  return selected.value ? [selected.value.name, page] : null
})
// Until the zones have come, the address is all there is to go on: a page
// opened on ?zona= is a chosen zone from its first frame, rather than saying
// «A Gaeta» and taking it back from over the title once they come (TD-53).
const zoneChosen = computed(() => (loaded.value ? !!selected.value : !!route.query.zona))

// A zone's rows come from two answers, this page's lists and the map's
// features, and are drawn once both are in. Drawn as each came, the tours and
// the dishes landed first and the zone's places pushed them down, or a zone
// said for a moment that it held nothing (TD-53). The page's note is not
// among them: it depends on no answer, so it is drawn at once, above where
// the rows land, and nothing they bring moves it (TD-54).
const ready = computed(() => loaded.value && mapStore.featuresLoaded)
// The wizard's third step is an answer too, with or without a zone: it waits
// the same way.
const answering = computed(() => zoneChosen.value || intentMode.value)

const placesHere = computed(() =>
  selected.value ? places.value.filter((p) => inZone(p.zones, selected.value!.slug)) : [],
)
const businessesHere = computed(() =>
  selected.value ? businesses.value.filter((b) => inZone(b.zones, selected.value!.slug)) : [],
)
// Every row the zone's activities are made of: its places and its businesses.
const rowsHere = computed(() => [...placesHere.value, ...businessesHere.value])
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

const genreName = computed(() => new Map(genres.value.map((g) => [g.slug, localName(g)])))
const kindOf = (place: MapCardFeature): string => {
  const words = types()
  if (place.type === 'chiese') return words.byType.chiese.one
  if (place.type === 'attivita')
    return (words.kinds as Record<string, string>)[place.kind ?? ''] ?? words.byType.attivita.one
  return genreName.value.get(place.genre ?? '') ?? words.byType.luoghi.one
}

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
  // The dishes, under the same heading as the zone's tables and botteghe and
  // after them (ADR-0010): for all of Gaeta, so with a note that says so.
  dishes?: { note: string; rows: Line[] }
  // Its rows are on the map: places, businesses, feste — not tours, not
  // dishes (D5).
  drawn?: boolean
  // Put away, on the wizard's third step: the rest of the zone, behind its
  // heading (review PR-21).
  closed?: boolean
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
// its tours and its feste. *Mangiare* comes last, because the dishes are not
// this zone's: they are for all of Gaeta (D3), and ahead of the zone's own
// places they answered a question nobody had asked. The zone's own tables and
// botteghe open it, and the dishes follow under their note (ADR-0010).
const tourLine = (tour: TourRow): Line => ({
  id: tour.id,
  title: tour.title,
  to: { name: 'itinerariodetail', params: { id: tour.id } },
})
const dishesBlock = (): Block['dishes'] =>
  ricette.value.length
    ? {
        note: cosaFare().blocks.dishes,
        rows: ricette.value.map((ricetta) => ({
          id: ricetta.id,
          title: ricetta.title,
          to: layerRoute('ricette', ricetta.id),
        })),
      }
    : undefined

const zoneBlocks = computed<Block[]>(() => {
  if (!selected.value) return []
  const list: Block[] = []
  for (const intent of intents.value) {
    if (intent.slug === 'mangiare') continue
    const rows = rowsHere.value.filter((p) => intentOf(p) === intent.slug).sort(byTitle)
    if (rows.length)
      list.push({
        key: intent.slug,
        name: localName(intent),
        rows: rows.map(placeLine),
        places: true,
        drawn: true,
      })
  }
  const known = new Set(intents.value.map((intent) => intent.slug))
  const other = rowsHere.value.filter((p) => {
    const intent = intentOf(p)
    return intent === OTHER_INTENT || !known.has(intent)
  })
  if (other.length)
    list.push({
      key: OTHER_INTENT,
      name: types().otherIntent,
      rows: other.sort(byTitle).map(placeLine),
      places: true,
      drawn: true,
    })
  if (toursHere.value.length)
    list.push({
      key: 'itinerari',
      name: cosaFare().blocks.toursHere,
      rows: toursHere.value.map(tourLine),
    })
  if (festeHere.value.length)
    list.push({
      key: 'feste',
      name: cosaFare().blocks.festeHere,
      rows: festeHere.value.map((festa) => ({
        id: festa.id,
        title: festa.title,
        to: layerRoute('feste', festa.id),
        detail: festa.recurrence,
      })),
      drawn: true,
    })
  const mangiare = intents.value.find((intent) => intent.slug === 'mangiare')
  const tables = businessesHere.value.filter((b) => intentOf(b) === 'mangiare').sort(byTitle)
  if (mangiare && (tables.length || ricette.value.length))
    list.push({
      key: 'mangiare',
      name: localName(mangiare),
      rows: tables.map(placeLine),
      places: true,
      drawn: true,
      dishes: dishesBlock(),
    })
  return list
})

// The wizard's third step (review PR-21, study 10): on top the intent's tours
// that pass through the zone (PR-4's rule, D2), then the intent's own section,
// both open; then the rest of the zone in its usual order, put away behind
// headings the reader opens — its other tours under «Altri itinerari». With no
// zone («Ovunque a Gaeta»), the intent's tours and its section alone, from
// all over Gaeta. Nothing ranks: alphabetical, as everywhere here (D5).
const intentBlocks = computed<Block[]>(() => {
  const intent = chosenIntent.value
  if (!intent) return []
  const zone = selected.value?.slug ?? null
  const here = (zoneSlugs: string[]) => (zone ? inZone(zoneSlugs, zone) : true)
  const itsTours = tours.value
    .filter((tour) => tour.intents.includes(intent.slug) && here(tour.zones))
    .sort(byTitle)
  const itsRows = [...places.value, ...businesses.value]
    .filter((row) => intentOf(row) === intent.slug && here(row.zones))
    .sort(byTitle)

  const list: Block[] = []
  if (itsTours.length)
    list.push({
      key: 'itinerari-intento',
      name: zone ? cosaFare().blocks.toursHere : cosaFare().blocks.tours,
      rows: itsTours.map(tourLine),
    })
  const dishes = intent.slug === 'mangiare' ? dishesBlock() : undefined
  if (itsRows.length || dishes)
    list.push({
      key: intent.slug,
      name: localName(intent),
      rows: itsRows.map(placeLine),
      places: true,
      drawn: true,
      dishes,
    })
  if (!zone) return list

  const shown = new Set(itsTours.map((tour) => tour.id))
  const rest = zoneBlocks.value.flatMap((block): Block[] => {
    if (block.key === intent.slug) return []
    if (block.key !== 'itinerari') return [{ ...block, closed: true }]
    const others = block.rows.filter((row) => !shown.has(row.id))
    if (!others.length) return []
    const name = shown.size ? cosaFare().blocks.otherToursHere : block.name
    return [{ ...block, name, rows: others, closed: true }]
  })
  return [...list, ...rest]
})

const blocks = computed(() => (intentMode.value ? intentBlocks.value : zoneBlocks.value))

// A heading of the third step opens and closes its section (a disclosure,
// cosa-fare.md Part I §4's shape); the reader's own choices, forgotten when
// the answers change — not when the phone's map is enlarged and put back.
const toggled = ref<string[]>([])
watch(
  () => [route.query.intento, route.query.zona],
  () => (toggled.value = []),
)
const isOpen = (block: Block) => !block.closed !== toggled.value.includes(block.key)
const toggle = (key: string) => {
  toggled.value = toggled.value.includes(key)
    ? toggled.value.filter((k) => k !== key)
    : [...toggled.value, key]
}
const sectionSize = (block: Block) => block.rows.length + (block.dishes?.rows.length ?? 0)

// The wizard's archive, for «Hai scelto»: whether the second step asks (it
// was skipped when one answer was all it had, and then there is nothing to go
// back to) and, when the zone has nothing of the intent, where it is instead.
const archive = computed<WizardArchive>(() => ({
  intents: intents.value,
  features: mapStore.features,
  tours: tours.value,
  dishes: ricette.value.length,
}))
const whereTo = computed(() =>
  chosenIntent.value && asksWhere(archive.value, chosenIntent.value.slug, zones.value)
    ? zoneStepOf(chosenIntent.value.slug)
    : null,
)
const intentEmpty = computed(
  () => intentMode.value && !intentBlocks.value.some((block) => !block.closed),
)
const intentElsewhere = computed(() =>
  chosenIntent.value
    ? zoneAnswers(archive.value, chosenIntent.value.slug, zones.value).filter(
        (zone) => zone.slug !== selected.value?.slug,
      )
    : [],
)

const emptyHere = computed(
  () =>
    !intentMode.value &&
    !!selected.value &&
    !rowsHere.value.length &&
    !festeHere.value.length &&
    !toursHere.value.length,
)
const zonesWithSomething = computed(() => chips.value.filter((chip) => chip.count > 0))

// The map draws exactly this page's set (D5): the zone's places, businesses
// and feste — on the wizard's third step, those of the sections open.
const drawnIds = computed(() =>
  blocks.value
    .filter((block) => block.drawn && isOpen(block))
    .flatMap((block) => block.rows.map((row) => row.id)),
)
watch(
  () => (selected.value || intentMode.value ? drawnIds.value : null),
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
  const gaeta = () => corners(zones.value.flatMap((zone) => outline(zone.geometry)))
  if (!selected.value && !intentMode.value) return gaeta()
  const ids = new Set(drawnIds.value)
  const set = mapStore.features
    .filter((feature) => ids.has(feature.id))
    .flatMap((f) => [...f.points, ...f.route])
  if (!selected.value) return corners(set) ?? gaeta()
  const slug = selected.value.slug
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

// «Dove sei?» chooses a zone the way a chip does: the address is the choice
// (review PR-20). On a phone the question then steps aside with the chips,
// so the field it was asked in folds away under the reader's focus — which
// goes to «Cambia zona», the control that brings it back, as the panel's own
// controls hand focus on when they disappear.
// Until the zones have come, the address is all there is to go on: a page
// opened on ?zona= starts with the question put away, rather than drawing it
// and folding it a moment later under the reader's eyes (a layout shift
// Lighthouse measured at 0.18 on a phone). A zone the archive does not have
// unfolds it again, since there is no «Cambia zona» then.
const asking = computed(() =>
  loaded.value ? !collapsed.value : isDesktop.value || choosing.value || !route.query.zona,
)
const changeZone = ref<HTMLButtonElement | null>(null)
const chooseZone = async (slug: string) => {
  choosing.value = false
  await router.push({ query: { zona: slug } })
  if (isDesktop.value) return
  await nextTick()
  changeZone.value?.focus()
}
</script>

<template>
  <article class="mx-auto w-full max-w-2xl pt-2">
    <!-- The wizard's third step (review PR-21): what was chosen, each answer
    a way back to the step that asked it, where the eyebrow would be — and
    the question it answers takes the focus, as on every step. -->
    <template v-if="intentMode">
      <WizardChoices
        :intent="chosenIntent ? localName(chosenIntent) : null"
        :intent-to="{ name: 'benvenuto' }"
        :where="chosenIntent ? (selected?.name ?? wizardText().everywhere) : null"
        :where-to="whereTo"
      />
      <MainTitle tabindex="-1" data-panel-focus class="mt-1 focus:outline-none">
        {{ cosaFare().title }}
      </MainTitle>
      <p v-if="zoneChosen" class="-mt-4 text-sm text-muted">
        {{ cosaFare().indicative }}
      </p>
    </template>
    <template v-else>
      <!-- «A Gaeta» until a zone is chosen; then the panel's eyebrow says which
      (review PR-23), and one eyebrow is enough. -->
      <p
        v-if="!zoneChosen"
        class="text-xs font-semibold tracking-[0.12em] text-terracotta uppercase"
      >
        {{ cosaFare().eyebrow }}
      </p>
      <MainTitle>{{ cosaFare().title }}</MainTitle>
      <!-- One line on a phone, where the results have to start on the first
      screen (review PR-4, M-07). -->
      <p class="mt-2 max-w-[55ch] text-reading text-muted">
        {{ isDesktop ? cosaFare().lead.wide : cosaFare().lead.phone }}
      </p>
    </template>

    <!-- Above the chips, and the first thing on a phone too (review PR-20):
    the guest who does not know the zones' names knows where they stand. The
    wizard's third step asks nothing: its answers were the steps before. -->
    <WhereAreYouField
      v-if="!intentMode"
      class="mt-6"
      :aliases="aliases"
      :zones="zones"
      :current="selected?.slug ?? null"
      :folded="!asking"
      ask-id="dove-sei"
      @choose="chooseZone"
    />

    <nav v-if="!intentMode" :aria-label="cosaFare().zones" class="mt-6">
      <!-- On a phone the open row runs to the panel's edges, so it reads as a
      row that scrolls, and «Cambia zona» goes under it. A row tall before the
      zones come, so they do not push the page down when they do (TD-53): all
      a phone draws, open or put away; the first row where they wrap. -->
      <div class="flex min-h-10 flex-wrap items-center gap-2">
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
          ref="changeZone"
          type="button"
          aria-controls="dove-sei zone-chips"
          :aria-expanded="!collapsed"
          class="inline-flex h-10 flex-none cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-sea underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
          @click="choosing = !choosing"
        >
          {{ cosaFare().changeZone }}
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
      <p class="mt-3 text-sm text-muted">{{ cosaFare().indicative }}</p>
    </nav>

    <!-- What the page lists, said before the list (TD-54, decided by the
    author on 2026-10-25): the archive's, not everything that happens in
    Gaeta — a list written by hand cannot be complete, so it says so first
    (CF33). It depends on no answer: drawn in the first frame, it is the
    largest text on a phone's first screen, the paint Lighthouse times the
    page by (LCP), and the zone's answer lands under it without moving it. At
    the foot it waited for the rows, which would have pushed it (TD-53), and a
    short zone's page painted its words 1.4 s after its title. -->
    <p class="mt-2 text-sm text-muted">
      {{ cosaFare().note }}
    </p>

    <p v-if="failed" class="mt-6 text-ink" role="status">
      {{ cosaFare().failed }}
    </p>

    <template v-if="(selected || intentMode) && ready">
      <!-- The wizard's answer has nothing here: said, with where it is. The
      rest of the zone is still offered, put away, under it. -->
      <p v-if="intentEmpty" class="mt-8 text-ink">
        {{ cosaFare().intentEmpty(chosenIntent ? localName(chosenIntent) : '') }}
        <template v-if="chosenIntent && intentElsewhere.length">
          {{ cosaFare().try }}
          <template v-for="zone in intentElsewhere" :key="zone.slug">
            <RouterLink :to="resultOf(chosenIntent.slug, zone.slug)" class="text-sea underline">{{
              zone.name
            }}</RouterLink
            >,
          </template>
          {{ cosaFare().or }}
          <RouterLink :to="resultOf(chosenIntent.slug)" class="text-sea underline">{{
            cosaFare().anywhere
          }}</RouterLink
          >.
        </template>
      </p>
      <p v-if="emptyHere" class="mt-8 text-ink">
        {{ cosaFare().emptyHere }}
        <template v-if="zonesWithSomething.length">
          {{ cosaFare().try }}
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
          <!-- On the wizard's third step every heading is a disclosure: the
          intent's open, the rest of the zone put away (review PR-21). -->
          <h2 class="font-display text-title text-ink">
            <button
              v-if="intentMode"
              type="button"
              :aria-expanded="isOpen(block)"
              :aria-controls="`sezione-${block.key}`"
              class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              @click="toggle(block.key)"
            >
              {{ block.name }}
              <span class="font-sans text-base font-normal text-muted">{{
                sectionSize(block)
              }}</span>
              <svg
                viewBox="0 0 20 20"
                class="h-4 w-4 flex-none text-muted transition-transform"
                :class="{ 'rotate-180': isOpen(block) }"
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
            <template v-else>{{ block.name }}</template>
          </h2>
          <p class="text-sm text-muted">
            <span aria-hidden="true">·</span> {{ cosaFare().alphabetical }}
          </p>
        </div>
        <div v-show="isOpen(block)" :id="`sezione-${block.key}`">
          <ul v-if="block.rows.length" class="divide-y divide-hairline border-y border-hairline">
            <li v-for="row in block.rows" :key="row.id" class="py-3">
              <RouterLink
                :to="row.to"
                class="text-ink underline"
                :class="{ 'font-semibold': block.places }"
                lang="it"
                >{{ row.title }}</RouterLink
              ><span v-if="row.draft" class="text-xs text-muted"> · {{ cosaFare().draft }}</span>
              <p v-if="row.detail" class="text-sm text-muted">{{ row.detail }}</p>
            </li>
          </ul>
          <template v-if="block.dishes">
            <p class="mb-3 text-sm text-muted" :class="{ 'mt-4': block.rows.length }">
              {{ block.dishes.note }}
            </p>
            <ul class="divide-y divide-hairline border-y border-hairline">
              <li v-for="row in block.dishes.rows" :key="row.id" class="py-3">
                <RouterLink :to="row.to" class="text-ink underline" lang="it">{{
                  row.title
                }}</RouterLink>
              </li>
            </ul>
          </template>
        </div>
      </section>
    </template>
    <p v-else-if="!answering" class="mt-8 text-muted">{{ cosaFare().chooseZone }}</p>
  </article>
</template>
