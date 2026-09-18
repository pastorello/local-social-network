<script setup lang="ts">
import axios from 'axios'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ActionButton from '@/components/buttons/ActionButton.vue'
import CardArticle from '@/components/content/CardArticle.vue'
import ItineraryForm from '@/components/content/ItineraryForm.vue'
import TranslateControl from '@/components/content/TranslateControl.vue'
import { useIsDesktop } from '@/composables/useBreakpoint'
import { useMapFocus } from '@/composables/useMapFocus'
import { itinerarioConfig } from '@/definitions/typeConfigs'
import type Itinerario from '@/definitions/interfaces/Itinerario'
import type { MapPoint } from '@/definitions/interfaces/Content'
import { layerRoute } from '@/lib/mapLayers'
import { readToken } from '@/lib/tokens'
import { legDirections } from '@/lib/tours'
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
const previous = computed(() =>
  step.value && step.value > 1 ? placed.value[step.value - 2] : null,
)
const directions = computed(() =>
  current.value?.point ? legDirections(previous.value?.point ?? null, current.value.point) : null,
)

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

// Entering or leaving the guided mode removes the button that was pressed,
// and the last "Tappa successiva" disables itself: either way focus would fall
// to the page's start (WCAG 2.4.3). It goes to the stop's heading — which also
// tells a screen reader where they are — or back to "Inizia il tour".
const stepHeading = ref<HTMLElement | null>(null)
const startButton = ref<{ $el: HTMLElement } | null>(null)
const goToStep = async (n: number | null) => {
  await router.push({ query: n ? { tappa: String(n) } : {} })
  await nextTick()
  const active = document.activeElement as HTMLButtonElement | null
  if (active && active !== document.body && !active.disabled) return
  if (n) stepHeading.value?.focus()
  else startButton.value?.$el.focus()
}

const getTour = async () => {
  try {
    tour.value = (await axios.get<Itinerario>(`/api/itinerari/${route.params.id}/`)).data
  } catch {
    toastStore.showToast(5000, 'Itinerario non trovato', 'bg-red-300')
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
    toastStore.showToast(5000, 'Itinerario eliminato', 'bg-emerald-500')
    router.push({ name: itinerarioConfig.routeNames.list })
  } catch {
    toastStore.showToast(5000, 'Impossibile eliminare l’itinerario.', 'bg-red-300')
  }
}

onMounted(getTour)

// Same reasoning as TypeDetailView: tour-to-translation keeps this instance.
watch(
  () => route.params.id,
  async () => {
    editing.value = false
    await getTour()
    editing.value = route.query.edit === '1'
  },
)

const stopLink = (type: string | null, card: string) => layerRoute(type ?? '', card)
</script>

<template>
  <div class="mx-auto w-full max-w-3xl">
    <!-- ============ following a percorso, one stop at a time (I7) ============ -->
    <article v-if="tour && !editing && current" class="pt-2">
      <p class="text-xs font-semibold tracking-[0.12em] text-terracotta uppercase">
        {{ tour.original_title || tour.title }} · Tappa {{ step }} di {{ placed.length }}
      </p>
      <h1
        ref="stepHeading"
        tabindex="-1"
        class="mt-2 font-display text-display text-balance text-ink focus:outline-none"
        lang="it"
      >
        {{ current.title }}
      </h1>
      <p v-if="current.point?.label" class="mt-1 text-muted">{{ current.point.label }}</p>
      <p v-if="current.note" class="mt-4 text-reading whitespace-pre-line text-ink">
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
          Come arrivarci<span class="sr-only"> (apre Google Maps)</span>
        </a>
        <RouterLink
          :to="stopLink(current.type, current.card)"
          class="inline-flex h-11 items-center rounded-full border border-field bg-surface px-5 text-sm font-semibold text-sea focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        >
          Leggi la scheda
        </RouterLink>
      </div>

      <nav
        aria-label="Tappe del tour"
        class="mt-8 flex items-center justify-between gap-3 border-t border-hairline pt-4"
      >
        <button
          type="button"
          class="h-11 cursor-pointer rounded-full px-4 text-sm font-semibold text-ink hover:bg-page disabled:cursor-default disabled:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
          :disabled="step === 1"
          @click="goToStep((step ?? 1) - 1)"
        >
          ← Tappa precedente
        </button>
        <button
          type="button"
          class="h-11 cursor-pointer rounded-full px-4 text-sm font-semibold text-sea underline"
          @click="goToStep(null)"
        >
          Torna all’itinerario
        </button>
        <button
          type="button"
          class="h-11 cursor-pointer rounded-full px-4 text-sm font-semibold text-ink hover:bg-page disabled:cursor-default disabled:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
          :disabled="step === placed.length"
          @click="goToStep((step ?? 0) + 1)"
        >
          Tappa successiva →
        </button>
      </nav>
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
      :type-label="isPercorso ? 'Itinerario · percorso' : 'Itinerario · raccolta'"
      :detail-route-name="itinerarioConfig.routeNames.detail"
      :back-to="{ name: itinerarioConfig.routeNames.list, label: 'itinerari' }"
    >
      <template #fields>
        <dl
          v-if="tour.duration || tour.intent_labels.length"
          class="mb-10 divide-y divide-hairline border-y border-hairline"
        >
          <div v-if="tour.duration" class="py-3 sm:flex sm:gap-6">
            <dt
              class="text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-40 sm:flex-none sm:pt-1"
            >
              Durata indicativa
            </dt>
            <dd class="text-ink">{{ tour.duration }}</dd>
          </div>
          <div v-if="tour.intent_labels.length" class="py-3 sm:flex sm:gap-6">
            <dt
              class="text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-40 sm:flex-none sm:pt-1"
            >
              Per chi vuole
            </dt>
            <dd class="text-ink">{{ tour.intent_labels.join(', ') }}</dd>
          </div>
        </dl>
      </template>

      <template #map>
        <section v-if="tour.stops.length" class="mb-10">
          <h2 class="mb-3 font-display text-title text-ink">
            {{ isPercorso ? 'Le tappe' : 'I luoghi' }}
          </h2>
          <p class="mb-4 text-muted">
            {{
              isPercorso
                ? 'Nell’ordine del giro, numerate sulla mappa'
                : 'In ordine di consiglio, numerati sulla mappa'
            }}
            {{ isDesktop ? 'qui accanto' : 'qui sopra' }}.
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
                >
                  {{ stop.title }}
                </RouterLink>
                <span v-if="stop.point?.label" class="text-sm text-muted">
                  · {{ stop.point.label }}</span
                >
                <!-- I4: only the author and admins ever receive such a stop. -->
                <p v-if="!stop.is_published" class="text-sm font-semibold text-status-open">
                  Scheda in bozza: i lettori non vedono questa tappa.
                </p>
                <p v-if="stop.note" class="mt-1 whitespace-pre-line text-ink">{{ stop.note }}</p>
              </div>
            </li>
          </component>

          <ActionButton
            v-if="isPercorso && placed.length"
            ref="startButton"
            class="mt-6"
            @click="goToStep(1)"
          >
            Inizia il tour
          </ActionButton>
        </section>
      </template>

      <template #actions>
        <div v-if="canEdit" class="flex flex-wrap items-center gap-2">
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

    <ItineraryForm v-else-if="tour" :tour="tour" @saved="onEdited" @cancel="editing = false" />
  </div>
</template>
