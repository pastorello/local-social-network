<script setup lang="ts">
import axios from 'axios'
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ActionButton from '@/components/buttons/ActionButton.vue'
import CardArticle from '@/components/content/CardArticle.vue'
import ItineraryForm from '@/components/content/ItineraryForm.vue'
import ShareButton from '@/components/content/ShareButton.vue'
import TranslateControl from '@/components/content/TranslateControl.vue'
import VisitInfo from '@/components/content/VisitInfo.vue'
import { useIsDesktop } from '@/composables/useBreakpoint'
import { useMapFocus } from '@/composables/useMapFocus'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePanelShape } from '@/composables/usePanelShape'
import { usePanelTrail } from '@/composables/usePanelTrail'
import { itinerarioConfig } from '@/definitions/typeConfigs'
import type Itinerario from '@/definitions/interfaces/Itinerario'
import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { MapPoint } from '@/definitions/interfaces/Content'
import { directionsUrl } from '@/lib/directions'
import { locale } from '@/lib/i18n'
import card from '@/lib/i18n/messages/card'
import tours from '@/lib/i18n/messages/tours'
import { wordsOf } from '@/lib/i18n/messages/types'
import { layerRoute } from '@/lib/mapLayers'
import { afterTour, type AfterTourLink } from '@/lib/tours'
import { readToken } from '@/lib/tokens'
import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'

// A curated tour (spec itinerari.md). Read as an article with its stops; a
// percorso can be followed one stop at a time (I7), and that position lives in
// the URL (`?tappa=3`), so a reload or a shared link lands on the same stop and
// nothing about the guest is stored anywhere.
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()
const { isDesktop } = useIsDesktop()

const tour = ref<Itinerario | null>(null)
const editing = ref(route.query.edit === '1')

const canEdit = computed(
  () =>
    tour.value !== null &&
    (userStore.user.id === tour.value.author.id || userStore.user.role === 'admin'),
)

const isPercorso = computed(() => tour.value?.form === 'percorso')
// Stops with somewhere to go; a stop's card always has one (the API refuses
// others), so this only guards against a card that lost its pins since.
const placed = computed(() => (tour.value?.stops ?? []).filter((stop) => stop.point))

// The guided mode: which stop, 1-based, or none.
const step = computed(() => {
  if (!isPercorso.value || !placed.value.length) return null
  const raw = Number(route.query.tappa)
  if (!Number.isInteger(raw) || raw < 1) return null
  return Math.min(raw, placed.value.length)
})
const current = computed(() => (step.value ? placed.value[step.value - 1] : null))
const isLast = computed(() => step.value !== null && step.value === placed.value.length)
// Only a percorso with somewhere to go is followed (I7).
const canGuide = computed(() => isPercorso.value && placed.value.length > 0)
const previous = computed(() =>
  step.value && step.value > 1 ? placed.value[step.value - 2] : null,
)
// Where the reader is, over the title (review PR-23). A tour is under
// «Itinerari», and each of its intents leads to the tours that share it; a
// stop is under its own tour — up is named after it — and says which stop it
// is. The tour the URL names, not the previous one while the next loads.
const shown = computed(() => (tour.value && tour.value.id === route.params.id ? tour.value : null))
const tourTitle = computed(() =>
  shown.value ? shown.value.original_title || shown.value.title : '',
)
// Its intents by name, in English where the author wrote one (review PR-19a).
const intentLabels = computed(() => {
  const open = shown.value
  if (!open) return []
  return open.intent_labels.map(
    (name, index) => (locale.value === 'en' && open.intent_labels_en?.[index]) || name,
  )
})
usePanelTrail(() => {
  const open = shown.value
  if (!open) return null
  if (current.value) {
    return {
      up: tourTitle.value,
      steps: [{ label: tours().stopOf(step.value ?? 1, placed.value.length) }],
    }
  }
  return {
    steps: open.intents.map((slug, index) => ({
      label: intentLabels.value[index] ?? slug,
      to: { name: itinerarioConfig.routeNames.list, query: { intento: slug } },
    })),
  }
})
usePageTitle(() => {
  if (!shown.value) return null
  return current.value
    ? [current.value.title, tourTitle.value]
    : [tourTitle.value, wordsOf('itinerari')?.label ?? 'Itinerari']
})

const directions = computed(() =>
  current.value?.point
    ? directionsUrl(current.value.point, { from: previous.value?.point ?? null })
    : null,
)

// A tour is read in its route's narrow panel, beside the map that draws it,
// and written in the editor's, like every card (review PR-13).
usePanelShape(() => (editing.value ? 'editor' : null))

// The map behind the panel shows the tour (I11, D16): its numbered stops and
// its path — the drawn one if the author drew it, else the stops joined in
// order for a percorso. In the guided mode, the leg being walked.
useMapFocus(() => {
  if (!tour.value) return null
  const accent = readToken('--color-sea', '#0f5f73')
  if (current.value?.point) {
    const leg: MapPoint[] = previous.value?.point ? [previous.value.point, current.value.point] : []
    return {
      id: tour.value.id,
      type: 'itinerari',
      points: [current.value.point],
      route: leg,
      color: accent,
    }
  }
  const points = placed.value.map((stop) => stop.point as MapPoint)
  if (!points.length) return null
  const path = tour.value.route.length > 1 ? tour.value.route : isPercorso.value ? points : []
  return {
    id: tour.value.id,
    type: 'itinerari',
    points,
    route: path,
    color: accent,
    numbered: true,
  }
})

// Entering or leaving the guided mode removes the button that was pressed, and
// so do the last "Tappa successiva" and the first "Precedente": focus would
// fall to the page's start (WCAG 2.4.3). It goes to the stop's heading — which
// also tells a screen reader where they are — or back to "Inizia il tour".
const stepHeading = ref<HTMLElement | null>(null)
const startButton = ref<{ $el: HTMLElement } | null>(null)
const finishHeadingId = useId()
// What a stop is, under its title (the itinerari canvas: "Chiesa",
// "Monumento"). Singular, where the map's layers are plural; in the reader's
// language (review PR-19a).
const typeLabel = (type: string) => wordsOf(type)?.one ?? ''
// The screen-reader half of "Portami": a leading space, set in the message
// because the template's whitespace between the two halves is condensed away.
const portamiLabel = (where: string) => tours().takeMeTo(where)

const goToStep = async (n: number | null) => {
  await router.push({ query: n ? { tappa: String(n) } : {} })
  await nextTick()
  const active = document.activeElement as HTMLButtonElement | null
  if (active && active !== document.body && !active.disabled) return
  if (n) stepHeading.value?.focus()
  else startButton.value?.$el.focus()
}

// After the last stop (review PR-7, decided 2026-10-22): another tour, what is
// around, something to eat — each only if something is behind it, which takes
// three short counts, asked for once the guest gets there.
const after = ref<AfterTourLink[]>([])
const loadAfter = async () => {
  const shown = tour.value
  if (!shown) return
  const last = placed.value[placed.value.length - 1]
  const count = { params: { page_size: 1 } }
  const [intents, tours, ricette] = await Promise.allSettled([
    axios.get<Intent[]>('/api/itinerari/intenti/'),
    axios.get<{ count: number }>('/api/itinerari/', count),
    axios.get<{ count: number }>('/api/ricette/', count),
  ])
  const counted = (result: PromiseSettledResult<{ data: { count: number } }>) =>
    result.status === 'fulfilled' ? result.value.data.count : 0
  // A failed count promises nothing rather than a door onto an empty room.
  after.value = afterTour({
    intents: shown.intents,
    isPublished: shown.is_published,
    intentCounts: intents.status === 'fulfilled' ? intents.value.data : [],
    tours: counted(tours),
    zone: last?.zones[0] ?? null,
    ricette: counted(ricette),
  })
}
watch(
  () => (isLast.value ? tour.value?.id : null),
  (id) => {
    if (id) loadAfter()
  },
)

const getTour = async () => {
  try {
    tour.value = (await axios.get<Itinerario>(`/api/itinerari/${route.params.id}/`)).data
  } catch {
    toastStore.showToast(5000, tours().notFound)
    router.push({ name: itinerarioConfig.routeNames.list })
  }
}

const onEdited = (updated: Itinerario) => {
  tour.value = updated
  editing.value = false
}

const deleteTour = async () => {
  if (!tour.value) return
  if (!window.confirm('Vuoi davvero eliminare questo itinerario?')) return
  try {
    await axios.delete(`/api/itinerari/${tour.value.id}/`)
    toastStore.showToast(5000, 'Itinerario eliminato')
    router.push({ name: itinerarioConfig.routeNames.list })
  } catch {
    toastStore.showToast(5000, 'Impossibile eliminare l’itinerario.')
  }
}

onMounted(getTour)

// Same reasoning as TypeDetailView: tour-to-translation keeps this instance.
watch(
  () => route.params.id,
  async () => {
    editing.value = false
    after.value = []
    await getTour()
    editing.value = route.query.edit === '1'
  },
)

const stopLink = (type: string | null, card: string) => layerRoute(type ?? '', card)
</script>

<template>
  <div class="mx-auto w-full max-w-3xl">
    <!-- ============ following a percorso, one stop at a time (I7) ============ -->
    <!-- Which tour, and which stop of it, is the panel's eyebrow above the
    title (review PR-23): «Itinerario E2E · Tappa 1 di 3», the tour's name as
    the way up to it. -->
    <article v-if="tour && !editing && current" class="pt-2">
      <h1
        ref="stepHeading"
        tabindex="-1"
        class="font-display text-display text-balance text-ink focus:outline-none"
        lang="it"
      >
        {{ current.title }}
      </h1>
      <p v-if="current.point?.label" class="mt-1 text-muted" lang="it">
        {{ current.point.label }}
      </p>
      <p v-if="current.note" class="mt-4 text-reading whitespace-pre-line text-ink" lang="it">
        {{ current.note }}
      </p>

      <div class="mt-6 flex flex-wrap gap-2">
        <a
          v-if="directions"
          :href="directions"
          target="_blank"
          rel="noopener"
          class="inline-flex h-11 items-center rounded-full bg-sea px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        >
          {{ card().directions }}<span class="sr-only">{{ tours().opensMapsHeard }}</span>
        </a>
        <RouterLink
          :to="stopLink(current.type, current.card)"
          class="inline-flex h-11 items-center rounded-full border border-field bg-surface px-5 text-sm font-semibold text-sea focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        >
          {{ tours().readCard }}
        </RouterLink>
        <!-- The stop itself, `?tappa=N` (review PR-16): the link opens on this
        stop, as a reload does (I7), with the tour one level up. -->
        <ShareButton v-if="tour.is_published" :query="{ tappa: String(step) }">
          {{ card().share }}<span class="sr-only">{{ card().shareStop }}</span>
        </ShareButton>
      </div>

      <!-- What the stop is, without a second tap (review PR-7): its cover if
      it has one — no placeholder, an empty block tells a guest nothing — the
      opening of its card, how to reach it, and what is known about getting in
      (ADR-0008: VisitInfo shows nothing when nothing is known). The rest is
      «Leggi la scheda». -->
      <img
        v-if="current.cover"
        :src="current.cover.imageURL"
        :alt="current.cover.caption || current.title"
        lang="it"
        class="mt-6 aspect-[3/2] w-full rounded-lg object-cover"
      />
      <p
        v-if="current.excerpt"
        class="mt-6 max-w-[65ch] text-reading whitespace-pre-line text-ink"
        lang="it"
      >
        {{ current.excerpt }}
      </p>
      <p
        v-if="current.how_to_get_there"
        class="mt-4 text-sm whitespace-pre-line text-muted"
        lang="it"
      >
        {{ current.how_to_get_there }}
      </p>
      <VisitInfo :availability="current.availability" class="mt-8" />

      <div class="mt-8 border-t border-hairline pt-6">
        <!-- The last stop has no "next": what comes after the tour does
        (decided 2026-10-22), each way only if something is behind it. -->
        <section v-if="isLast" :aria-labelledby="finishHeadingId">
          <h2 :id="finishHeadingId" class="font-display text-title text-ink">
            {{ tours().finished }}
          </h2>
          <ul v-if="after.length" class="mt-4 space-y-2">
            <li v-for="link in after" :key="link.label">
              <RouterLink
                :to="link.to"
                class="flex min-h-11 items-center gap-3 rounded-xl border border-hairline bg-surface p-3 hover:border-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              >
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold text-ink">{{ link.label }}</span>
                  <span class="block truncate text-sm text-muted">{{ link.detail }}</span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="size-5 flex-none text-muted"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                    clip-rule="evenodd"
                  />
                </svg>
              </RouterLink>
            </li>
          </ul>
        </section>

        <nav :aria-label="tours().stopsNav" :class="{ 'mt-6': isLast }">
          <!-- One way forward, full width and primary; the two ways back are
          links under it, and the first stop has no "previous" at all. -->
          <button
            v-if="!isLast"
            type="button"
            class="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-sea px-5 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            @click="goToStep((step ?? 0) + 1)"
          >
            {{ tours().next }} <span aria-hidden="true">→</span>
          </button>
          <div
            class="flex flex-wrap items-center justify-center gap-x-6"
            :class="{ 'mt-2': !isLast }"
          >
            <button
              v-if="step && step > 1"
              type="button"
              class="h-11 cursor-pointer text-sm font-semibold whitespace-nowrap text-sea underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              @click="goToStep((step ?? 2) - 1)"
            >
              <span aria-hidden="true">←</span> {{ tours().previous }}
            </button>
            <button
              type="button"
              class="h-11 cursor-pointer text-sm font-semibold whitespace-nowrap text-sea underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              @click="goToStep(null)"
            >
              {{ tours().backToTour }}
            </button>
          </div>
        </nav>
      </div>
    </article>

    <!-- ============ the tour, read as an article ============ -->
    <CardArticle
      v-else-if="tour && !editing"
      :title="tour.original_title || tour.title"
      :subtitle="tour.translation_of ? tour.title : null"
      :language="tour.language"
      :body-html="tour.body_html"
      :author="tour.author"
      :created-at="tour.created_at"
      :is-published="tour.is_published"
      :images="tour.images"
      :translations="tour.translations"
      :detail-route-name="itinerarioConfig.routeNames.detail"
      :back-to="{
        name: itinerarioConfig.routeNames.list,
        label: card().back.itinerari,
      }"
    >
      <template #fields>
        <dl
          v-if="tour.duration || tour.intent_labels.length"
          class="divide-y divide-hairline border-y border-hairline"
          :class="canGuide ? 'mb-6' : 'mb-10'"
        >
          <div v-if="tour.duration" class="py-3 sm:flex sm:gap-6">
            <dt
              class="text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-40 sm:flex-none sm:pt-1"
            >
              {{ tours().duration }}
            </dt>
            <dd class="text-ink" :lang="tour.language">{{ tour.duration }}</dd>
          </div>
          <div v-if="tour.intent_labels.length" class="py-3 sm:flex sm:gap-6">
            <dt
              class="text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-40 sm:flex-none sm:pt-1"
            >
              {{ tours().forWho }}
            </dt>
            <dd class="text-ink">{{ intentLabels.join(', ') }}</dd>
          </div>
        </dl>
        <!-- Where a guest who came from the QR looks for it: before the stops,
        not after a list they have to scroll (review PR-7); repeated under it. -->
        <ActionButton v-if="canGuide" ref="startButton" class="mb-10" @click="goToStep(1)">
          {{ tours().start }}
        </ActionButton>
      </template>

      <template #map>
        <section v-if="tour.stops.length" class="mb-10">
          <h2 class="mb-3 font-display text-title text-ink">
            {{ isPercorso ? tours().stops : tours().places }}
          </h2>
          <p class="mb-4 text-muted">
            {{ isPercorso ? tours().order.percorso(isDesktop) : tours().order.raccolta(isDesktop) }}
          </p>
          <component :is="isPercorso ? 'ol' : 'ul'" class="space-y-4">
            <li
              v-for="(stop, index) in tour.stops"
              :key="`${stop.card}-${index}`"
              class="flex gap-3"
            >
              <span
                class="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sea text-sm font-semibold text-white"
                aria-hidden="true"
                >{{ index + 1 }}</span
              >
              <div class="min-w-0">
                <RouterLink
                  :to="stopLink(stop.type, stop.card)"
                  class="font-semibold text-ink underline-offset-4 hover:underline"
                  lang="it"
                >
                  {{ stop.title }}
                </RouterLink>
                <span v-if="isPercorso && stop.point?.label" class="text-sm text-muted" lang="it">
                  · {{ stop.point.label }}</span
                >
                <p v-if="stop.type" class="text-sm text-muted">{{ typeLabel(stop.type) }}</p>
                <!-- I4: only the author and admins ever receive such a stop. -->
                <p
                  v-if="!stop.is_published"
                  class="text-sm font-semibold text-status-open"
                  lang="it"
                >
                  Scheda in bozza: i lettori non vedono questa tappa.
                </p>
                <p v-if="stop.note" class="mt-1 whitespace-pre-line text-ink" lang="it">
                  {{ stop.note }}
                </p>
                <!-- A raccolta is not walked in order, so each place carries its
                own way there (the itinerari canvas, decided 2026-09-19): a dish
                lists every bakery it is sold at, a beach says how to reach it. -->
                <template v-if="!isPercorso">
                  <p
                    v-if="stop.how_to_get_there"
                    class="mt-1 text-sm whitespace-pre-line text-muted"
                    lang="it"
                  >
                    {{ stop.how_to_get_there }}
                  </p>
                  <ul v-if="stop.places.length" class="mt-2 space-y-1">
                    <li
                      v-for="(place, placeIndex) in stop.places"
                      :key="placeIndex"
                      class="flex flex-wrap items-center gap-x-3 gap-y-1"
                    >
                      <span v-if="place.label" class="text-ink" lang="it">{{ place.label }}</span>
                      <a
                        :href="directionsUrl(place, { mode: null })"
                        target="_blank"
                        rel="noopener"
                        class="text-sm font-semibold text-sea underline underline-offset-4"
                      >
                        {{ tours().takeMe
                        }}<span class="sr-only">{{ portamiLabel(place.label || stop.title) }}</span>
                      </a>
                    </li>
                  </ul>
                </template>
              </div>
            </li>
          </component>

          <ActionButton v-if="canGuide" class="mt-6" @click="goToStep(1)">
            {{ tours().start }}
          </ActionButton>
        </section>
      </template>

      <!-- A collaborator's controls: Italian, and marked so (review PR-19a). -->
      <template #actions>
        <div v-if="canEdit" class="flex flex-wrap items-center gap-2" lang="it">
          <ActionButton size="small" @click="editing = true">Modifica</ActionButton>
          <ActionButton size="small" button-type="danger" @click="deleteTour">Elimina</ActionButton>
          <TranslateControl
            v-if="!tour.translation_of"
            :translate-endpoint="`/api/itinerari/${tour.id}/traduci/`"
            :translations="tour.translations"
            :detail-route-name="itinerarioConfig.routeNames.detail"
          />
        </div>
      </template>
    </CardArticle>

    <ItineraryForm
      v-else-if="tour"
      :tour="tour"
      lang="it"
      @saved="onEdited"
      @cancel="editing = false"
    />
  </div>
</template>
