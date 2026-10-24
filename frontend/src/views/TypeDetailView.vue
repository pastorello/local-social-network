<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import CardArticle from '@/components/content/CardArticle.vue'
import DirectionsLink from '@/components/content/DirectionsLink.vue'
import { useIsDesktop } from '@/composables/useBreakpoint'
import { useMapFocus } from '@/composables/useMapFocus'
import { usePageTitle } from '@/composables/usePageTitle'
import { cardPanelShape, usePanelShape } from '@/composables/usePanelShape'
import { usePanelTrail } from '@/composables/usePanelTrail'
import { useMapStore } from '@/stores/map'
import TypeForm from '@/components/content/TypeForm.vue'
import TranslateControl from '@/components/content/TranslateControl.vue'
import VisitInfo from '@/components/content/VisitInfo.vue'
import WhereLine from '@/components/content/WhereLine.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type { TypeConfig } from '@/definitions/typeConfigs'
import type { Availability, ContentItem, MapPoint, ZoneRef } from '@/definitions/interfaces/Content'
import { directionsUrl } from '@/lib/directions'

const props = defineProps<{ config: TypeConfig }>()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()
const mapStore = useMapStore()
const { isDesktop } = useIsDesktop()

// The card comes with the route (lib/cardFirst.ts): fetched before this page
// mounted, so the panel is born in the shape the card asks for (review PR-10).
// Without it — the request failed, or a type with no place, which is not
// fetched first — the page asks itself.
const brought = () => {
  const card = route.meta.card as ContentItem | undefined
  return card && card.id === route.params.id ? card : null
}
const item = ref<ContentItem | null>(brought())
// A freshly-started translation (see TranslateControl) is an empty draft —
// its detail page opens straight into edit mode via ?edit=1 rather than
// showing a blank read view first.
const editing = ref(route.query.edit === '1')

const canEdit = computed(
  () =>
    item.value !== null &&
    (userStore.user.id === item.value.author.id || userStore.user.role === 'admin'),
)

const pins = computed(() => (item.value?.pins as MapPoint[] | undefined) ?? [])
const labelledPins = computed(() => pins.value.filter((pin) => pin.label))
// «Dove si trova» (review PR-3): only for a card that has somewhere to go.
const hasPlace = computed(() => props.config.mapMode === 'pins' && pins.value.length > 0)
// One place — a church, a luogo — has one way there, the section's button; a
// card with several (the shops a dish is sold in, a figure's birthplace and
// monument) gives each its own.
const onlyPin = computed(() => (pins.value.length === 1 ? (pins.value[0] ?? null) : null))
// «Dove» over the text (review PR-24) is for a card that *is* a place — a
// type whose footprint is one fixed pin, a church or a luogo — not for one
// that has places: a ricetta's shops or a personaggio's birthplace would make
// the line choose one, and they keep their ways there under «Dove si trova».
const whereLine = computed(() => (props.config.maxPoints === 1 ? onlyPin.value : null))
const zones = computed(() => (item.value?.zones as ZoneRef[] | undefined) ?? [])
const zoneNames = computed(() => zones.value.map((zone) => zone.name).join(' · '))

// The card the URL names — not the one before it, which a card opened from
// another card's page shows until the new one has loaded.
const shown = computed(() => (item.value && item.value.id === route.params.id ? item.value : null))

// Where it is, over its title (review PR-23): the type's list is the panel's
// own way up; each zone the card is in leads to what else is there.
usePanelTrail(() =>
  shown.value
    ? {
        steps: zones.value.map((zone) => ({
          label: zone.name,
          to: { name: 'cosafare', query: { zona: zone.slug } },
        })),
      }
    : null,
)
// «Santissima Annunziata · Chiese · Vivere Gaeta» — by its Italian name, the
// heading of a translation too (T7).
usePageTitle(() =>
  shown.value ? [shown.value.original_title || shown.value.title, props.config.label] : null,
)

// D17 by the card, not by its type (review PR-10): a card of a type with a
// place that has none — a ricetta sold nowhere — opens wide over a veiled map,
// like a book; with no strip of map on a phone. A type with no place at all
// leaves it to its route, which is wide already — until its form opens, which
// is written in the editor's shape like every other (review PR-13).
usePanelShape(() =>
  item.value && (props.config.mapMode === 'pins' || editing.value)
    ? cardPanelShape(hasPlace.value, editing.value)
    : null,
)

// The map behind the panel shows this card's place while it is open (D16).
useMapFocus(() =>
  item.value && props.config.mapMode === 'pins' && pins.value.length
    ? { id: item.value.id, type: props.config.key, points: pins.value, route: [] }
    : null,
)

// A type with a door (ADR-0008): what is known about getting in, and — for a
// church — «Se la trovi chiusa» (cosa-fare.md D7).
const availability = computed(() =>
  props.config.visit ? (item.value?.availability as Availability | undefined) : undefined,
)
const fromOutside = computed(() =>
  props.config.visit?.fromOutside ? ((item.value?.from_outside as string | undefined) ?? '') : '',
)

const filledFields = computed(() =>
  props.config.extraFields.filter(
    (field) => Boolean(item.value?.[field.key]) && !(hasPlace.value && field.inPlace),
  ),
)
// Read with the way there rather than among the facts (luoghi's «Come
// arrivarci» text), where there is a place to read it under.
const placeFields = computed(() =>
  hasPlace.value
    ? props.config.extraFields.filter((field) => field.inPlace && Boolean(item.value?.[field.key]))
    : [],
)

const getItem = async () => {
  await axios
    .get(`${props.config.endpoint}${route.params.id}/`)
    .then((response) => {
      item.value = response.data
    })
    .catch(() => {
      toastStore.showToast(5000, 'Scheda non trovata')
      router.push({ name: props.config.routeNames.list })
    })
}

const onEdited = (updated: ContentItem) => {
  // A card just published — or unpublished, or moved — changes the map.
  mapStore.fetchFeatures()
  item.value = updated
  editing.value = false
}

const deleteItem = async () => {
  if (!item.value) return
  if (!window.confirm('Vuoi davvero eliminare questa scheda?')) return

  await axios
    .delete(`${props.config.endpoint}${item.value.id}/`)
    .then(() => {
      toastStore.showToast(5000, 'Scheda eliminata')
      mapStore.fetchFeatures()
      router.push({ name: props.config.routeNames.list })
    })
    .catch(() => {
      toastStore.showToast(5000, 'Impossibile eliminare la scheda.')
    })
}

onMounted(() => {
  if (!item.value) getItem()
})

// Navigating from one card's detail page straight to another's (e.g. a
// TranslateControl link) keeps the same route record, so Vue Router reuses
// this component instance instead of remounting it — refetch when the id in
// the URL changes. `editing` drops to false first: TypeForm only reads its
// `item` prop once at setup, so flipping it straight to true would mount the
// form with the still-stale (previous card's) item until the fetch resolves.
watch(
  () => route.params.id,
  async () => {
    editing.value = false
    const card = brought()
    if (card) item.value = card
    else await getItem()
    editing.value = route.query.edit === '1'
  },
)
</script>

<template>
  <ViewContainer class="grid-cols-1">
    <div>
      <template v-if="item && !editing">
        <CardArticle
          :title="item.original_title || item.title"
          :subtitle="item.translation_of ? item.title : null"
          :language="item.language"
          :body-html="item.body_html"
          :author="item.author"
          :created-at="item.created_at"
          :is-published="item.is_published"
          :images="item.images"
          :translations="item.translations"
          :detail-route-name="config.routeNames.detail"
          :back-to="{ name: config.routeNames.list, label: config.label.toLowerCase() }"
        >
          <!-- The pin is the original's on a translation, as the map's is
          (translations.md T5); the sentence is the card's own, in the
          language it is read in, as under «Dove si trova». -->
          <template #lead>
            <WhereLine
              v-if="whereLine"
              :place="whereLine"
              :how-to-get-there="(item.how_to_get_there as string | undefined) ?? ''"
            />
          </template>

          <!-- A type's own fields are a small table of facts, not sentences
          with a bold word in front of them: "Dosi: per 8 persone" reads as a
          label and a value, so it is marked up as one. -->
          <template #fields>
            <dl
              v-if="filledFields.length"
              class="mb-10 divide-y divide-hairline border-y border-hairline"
            >
              <div v-for="field in filledFields" :key="field.key" class="py-3 sm:flex sm:gap-6">
                <dt
                  class="text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-40 sm:flex-none sm:pt-1"
                >
                  {{ field.label }}
                </dt>
                <dd class="whitespace-pre-line text-ink">
                  {{ item![field.displayKey ?? field.key] }}
                </dd>
              </div>
            </dl>

            <VisitInfo :availability="availability" />

            <!-- For the reader already at the door (cosa-fare.md D7): after the
            text, and only when someone wrote it — a reader who got in skips
            nothing. -->
            <section v-if="fromOutside" class="mb-10">
              <h2 class="mb-3 font-display text-title text-ink">Se la trovi chiusa</h2>
              <p class="max-w-[65ch] whitespace-pre-line text-reading text-ink">
                {{ fromOutside }}
              </p>
            </section>
          </template>

          <template #map>
            <!-- For the reader standing in town (review PR-3): which part of
            Gaeta, how one gets there in the author's words, and the way there
            from where they stand. -->
            <section v-if="hasPlace" class="mb-10">
              <h2 class="mb-3 font-display text-title text-ink">Dove si trova</h2>
              <p v-if="zoneNames" class="font-semibold text-ink">{{ zoneNames }}</p>
              <p
                v-for="field in placeFields"
                :key="field.key"
                class="mt-2 max-w-[65ch] whitespace-pre-line text-reading text-ink"
              >
                {{ item![field.key] }}
              </p>

              <template v-if="onlyPin">
                <ul v-if="labelledPins.length" class="mt-3 list-disc space-y-1 pl-5 text-ink">
                  <li v-for="(pin, index) in labelledPins" :key="index">{{ pin.label }}</li>
                </ul>
                <DirectionsLink :place="onlyPin" class="mt-4" />
              </template>
              <!-- Several places: each row names its own, which is the link's
              context (WCAG 2.4.4) — "Come arrivarci" beside "Forno Rossi". -->
              <ul v-else class="mt-3 space-y-2">
                <li
                  v-for="(pin, index) in pins"
                  :key="pin.id ?? index"
                  class="flex flex-wrap items-center gap-x-3 gap-y-1"
                >
                  <span class="text-ink">{{ pin.label || `Punto ${index + 1}` }}</span>
                  <a
                    :href="directionsUrl(pin)"
                    target="_blank"
                    rel="noopener"
                    class="text-sm font-semibold text-sea underline underline-offset-4"
                  >
                    Come arrivarci <span class="font-normal">(apre Google Maps)</span>
                  </a>
                </li>
              </ul>

              <!-- The map is beside the panel on a wide screen and in the
              strip above it on a phone, already showing the place (D16/D18) —
              a second map inside the panel would be a map over a map. On a
              phone the strip is small, so the section offers to enlarge it
              too: the same `?mappa=1` step the strip's own button takes. -->
              <p class="mt-4 text-muted">
                È evidenziato sulla mappa, {{ isDesktop ? 'qui accanto' : 'qui sopra' }}.
                <RouterLink
                  v-if="!isDesktop"
                  :to="{ query: { ...route.query, mappa: '1' } }"
                  class="font-semibold whitespace-nowrap text-sea underline underline-offset-4"
                >
                  Allarga la mappa
                </RouterLink>
              </p>
            </section>
          </template>

          <template #actions>
            <div v-if="canEdit" class="flex flex-wrap items-center gap-2">
              <ActionButton size="small" @click="editing = true">Modifica</ActionButton>
              <ActionButton size="small" button-type="danger" @click="deleteItem">
                Elimina
              </ActionButton>
              <TranslateControl
                v-if="!item.translation_of"
                :translate-endpoint="`${config.endpoint}${item.id}/traduci/`"
                :translations="item.translations"
                :detail-route-name="config.routeNames.detail"
              />
            </div>
          </template>
        </CardArticle>
      </template>

      <PanelBox v-else-if="item" class="mx-auto w-full max-w-3xl">
        <TypeForm :config="config" :item="item" @saved="onEdited" @cancel="editing = false" />
      </PanelBox>
    </div>
  </ViewContainer>
</template>
