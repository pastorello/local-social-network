<script setup lang="ts">
import axios from 'axios'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import MainTitle from '@/components/typography/MainTitle.vue'
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
// open (ADR-0008).

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
const chips = computed(() => [
  ...zones.value.map((zone) => ({ slug: zone.slug, name: zone.name, count: zone.count })),
  ...(elsewhereCount.value
    ? [{ slug: ELSEWHERE, name: ELSEWHERE_NAME, count: elsewhereCount.value }]
    : []),
])

const selected = computed(() => {
  const slug = typeof route.query.zona === 'string' ? route.query.zona : ''
  return chips.value.find((chip) => chip.slug === slug) ?? null
})

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

// The sections, in the author's order of intents (D4). *Mangiare* is the dishes
// for all of Gaeta; the others hold this zone's places; a genre nobody has
// mapped yet lands under «Altro da vedere» rather than nowhere.
const sections = computed(() => {
  const list: { key: string; name: string; rows: MapCardFeature[]; recipes: boolean }[] = []
  for (const intent of intents.value) {
    if (intent.slug === 'mangiare') {
      if (ricette.value.length)
        list.push({ key: 'mangiare', name: intent.name, rows: [], recipes: true })
      continue
    }
    const rows = placesHere.value.filter((p) => intentOf(p) === intent.slug).sort(byTitle)
    if (rows.length) list.push({ key: intent.slug, name: intent.name, rows, recipes: false })
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
      rows: other.sort(byTitle),
      recipes: false,
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
onBeforeUnmount(() => mapStore.setRestriction(null))
</script>

<template>
  <article class="mx-auto w-full max-w-2xl pt-2">
    <p class="text-xs font-semibold tracking-[0.12em] text-terracotta uppercase">A Gaeta</p>
    <MainTitle>Cosa si può fare qui</MainTitle>
    <p class="mt-2 max-w-[55ch] text-reading text-muted">
      Scegli una zona: trovi i luoghi da vedere, gli itinerari che ci passano e le feste che la
      attraversano.
    </p>

    <nav aria-label="Zone" class="mt-6">
      <ul class="flex flex-wrap gap-2">
        <li v-for="chip in chips" :key="chip.slug">
          <RouterLink
            :to="{ query: { zona: chip.slug } }"
            :aria-current="selected?.slug === chip.slug ? 'page' : undefined"
            class="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            :class="
              selected?.slug === chip.slug
                ? 'border-sea bg-sea text-white'
                : 'border-field bg-surface text-ink hover:border-sea'
            "
          >
            {{ chip.name }}
            <span :class="selected?.slug === chip.slug ? 'text-white' : 'text-muted'">{{
              chip.count
            }}</span>
          </RouterLink>
        </li>
      </ul>
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
      <p v-else class="mt-8 text-sm text-muted">In ordine alfabetico.</p>

      <section v-for="section in sections" :key="section.key" class="mt-8">
        <h2 class="mb-3 font-display text-title text-ink">{{ section.name }}</h2>
        <template v-if="section.recipes">
          <p class="mb-3 text-sm text-muted">
            Le ricette non stanno in una zona sola: queste valgono per tutta Gaeta.
          </p>
          <ul class="divide-y divide-hairline border-y border-hairline">
            <li v-for="ricetta in ricette" :key="ricetta.id" class="py-3">
              <RouterLink :to="layerRoute('ricette', ricetta.id)" class="text-ink underline">{{
                ricetta.title
              }}</RouterLink>
            </li>
          </ul>
        </template>
        <ul v-else class="divide-y divide-hairline border-y border-hairline">
          <li v-for="place in section.rows" :key="place.id" class="py-3">
            <RouterLink
              :to="layerRoute(place.type, place.id)"
              class="font-semibold text-ink underline"
              >{{ place.title }}</RouterLink
            >
            <p class="text-sm text-muted">
              {{ kindOf(place)
              }}<template v-if="place.access && STATE_SENTENCE[place.access]">
                · {{ STATE_SENTENCE[place.access] }}</template
              >
            </p>
          </li>
        </ul>
      </section>

      <section v-if="toursHere.length" class="mt-8">
        <h2 class="mb-3 font-display text-title text-ink">Itinerari che passano di qui</h2>
        <ul class="divide-y divide-hairline border-y border-hairline">
          <li v-for="tour in toursHere" :key="tour.id" class="py-3">
            <RouterLink
              :to="{ name: 'itinerariodetail', params: { id: tour.id } }"
              class="text-ink underline"
              >{{ tour.title }}</RouterLink
            >
          </li>
        </ul>
      </section>

      <section v-if="festeHere.length" class="mt-8">
        <h2 class="mb-3 font-display text-title text-ink">Le feste di questa zona</h2>
        <ul class="divide-y divide-hairline border-y border-hairline">
          <li v-for="festa in festeHere" :key="festa.id" class="py-3">
            <RouterLink :to="layerRoute('feste', festa.id)" class="text-ink underline">{{
              festa.title
            }}</RouterLink>
            <p v-if="festa.recurrence" class="text-sm text-muted">{{ festa.recurrence }}</p>
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
