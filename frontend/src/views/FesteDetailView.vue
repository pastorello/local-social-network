<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import CardArticle from '@/components/content/CardArticle.vue'
import DirectionsLink from '@/components/content/DirectionsLink.vue'
import FestaDates from '@/components/content/FestaDates.vue'
import FesteForm from '@/components/content/FesteForm.vue'
import { useIsDesktop } from '@/composables/useBreakpoint'
import { useMapFocus } from '@/composables/useMapFocus'
import { usePageTitle } from '@/composables/usePageTitle'
import { cardPanelShape, usePanelShape } from '@/composables/usePanelShape'
import { usePanelTrail } from '@/composables/usePanelTrail'
import { useMapStore } from '@/stores/map'
import TranslateControl from '@/components/content/TranslateControl.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type Feste from '@/definitions/interfaces/Feste'
import { localName } from '@/lib/i18n'
import card from '@/lib/i18n/messages/card'
import { wordsOf } from '@/lib/i18n/messages/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()
const mapStore = useMapStore()
const { isDesktop } = useIsDesktop()

// The festa comes with the route (lib/cardFirst.ts): fetched before this page
// mounted, so the panel is born in the shape it asks for (review PR-10).
// Without it — the request failed — the page asks itself.
const brought = () => {
  const card = route.meta.card as Feste | undefined
  return card && card.id === route.params.id ? card : null
}
const feste = ref<Feste | null>(brought())
// A freshly-started translation (see TranslateControl) is an empty draft —
// its detail page opens straight into edit mode via ?edit=1 rather than
// showing a blank read view first.
const editing = ref(route.query.edit === '1')

const canEdit = computed(
  () =>
    feste.value !== null &&
    (userStore.user.id === feste.value.author.id || userStore.user.role === 'admin'),
)

const getFeste = async () => {
  await axios
    .get(`/api/feste/${route.params.id}/`)
    .then((response) => {
      feste.value = response.data
    })
    .catch(() => {
      toastStore.showToast(5000, card().festaNotFound)
      router.push('/feste')
    })
}

// The festa the URL names, not the previous one while the next loads.
const shown = computed(() =>
  feste.value && feste.value.id === route.params.id ? feste.value : null,
)

// Over its title (review PR-23): «Feste» is the panel's way up; each zone the
// procession stops in leads to what else is there.
usePanelTrail(() =>
  shown.value
    ? {
        steps: (shown.value.zones ?? []).map((zone) => ({
          label: localName(zone),
          to: { name: 'cosafare', query: { zona: zone.slug } },
        })),
      }
    : null,
)
usePageTitle(() =>
  shown.value
    ? [shown.value.original_title || shown.value.title, wordsOf('feste')?.label ?? 'Feste']
    : null,
)

// Where the procession sets off — what "Portami alla partenza" leads to (review
// PR-3): a reader joins a feast at its start, not at whichever stop is nearest.
const start = computed(() => feste.value?.route[0] ?? null)

// D17 by the card, not by its type (review PR-10): a festa whose procession
// nobody has drawn yet has no place to show, and opens wide over a veiled map.
usePanelShape(() =>
  feste.value ? cardPanelShape(feste.value.route.length > 0, editing.value) : null,
)

// The map behind the panel draws this feast's route while it is open (D16).
useMapFocus(() =>
  feste.value && feste.value.route.length
    ? { id: feste.value.id, type: 'feste', points: [], route: feste.value.route }
    : null,
)

const onEdited = (updated: Feste) => {
  // A feast just published — or unpublished, or re-routed — changes the map.
  mapStore.fetchFeatures()
  feste.value = updated
  editing.value = false
}

const deleteFeste = async () => {
  if (!feste.value) return
  if (!window.confirm('Vuoi davvero eliminare questa scheda?')) return

  await axios
    .delete(`/api/feste/${feste.value.id}/`)
    .then(() => {
      toastStore.showToast(5000, 'Scheda eliminata')
      mapStore.fetchFeatures()
      router.push('/feste')
    })
    .catch(() => {
      toastStore.showToast(5000, 'Impossibile eliminare la scheda.')
    })
}

onMounted(() => {
  if (!feste.value) getFeste()
})

// Navigating from one card's detail page straight to another's (e.g. a
// TranslateControl link) keeps the same route record, so Vue Router reuses
// this component instance instead of remounting it — refetch when the id in
// the URL changes. `editing` drops to false first: FesteForm only reads its
// `feste` prop once at setup, so flipping it straight to true would mount
// the form with the still-stale (previous card's) feste until the fetch
// resolves.
watch(
  () => route.params.id,
  async () => {
    editing.value = false
    const card = brought()
    if (card) feste.value = card
    else await getFeste()
    editing.value = route.query.edit === '1'
  },
)
</script>

<template>
  <ViewContainer class="grid-cols-1">
    <div>
      <template v-if="feste && !editing">
        <CardArticle
          :title="feste.original_title || feste.title"
          :subtitle="feste.translation_of ? feste.title : null"
          :language="feste.language"
          :body-html="feste.body_html"
          :author="feste.author"
          :created-at="feste.created_at"
          :is-published="feste.is_published"
          :images="feste.images"
          :translations="feste.translations"
          detail-route-name="festedetail"
          :back-to="{ name: 'festelist', label: card().back.feste }"
        >
          <template #fields>
            <dl class="mb-10 divide-y divide-hairline border-y border-hairline">
              <div class="py-3 sm:flex sm:gap-6">
                <dt
                  class="text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-40 sm:flex-none sm:pt-1"
                >
                  {{ card().festa.when }}
                </dt>
                <dd class="text-ink">
                  <FestaDates
                    :editions="feste.editions ?? []"
                    :recurrence="feste.recurrence"
                    :recurrence-lang="feste.language"
                  />
                </dd>
              </div>
              <div v-if="feste.programme" class="py-3 sm:flex sm:gap-6">
                <dt
                  class="text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-40 sm:flex-none sm:pt-1"
                >
                  {{ card().festa.programme }}
                </dt>
                <dd class="whitespace-pre-line text-ink" :lang="feste.language">
                  {{ feste.programme }}
                </dd>
              </div>
            </dl>
          </template>

          <template #map>
            <section v-if="feste.route.length > 0" class="mb-10">
              <h2 class="mb-3 font-display text-title text-ink">{{ card().festa.route }}</h2>
              <!-- The route is drawn on the map — beside the panel on a wide
              screen, in the strip above it on a phone (D16/D18) — so the panel
              keeps only the stops, in words: the text path the map does not
              offer. -->
              <p class="mb-3 text-muted">
                {{ card().highlighted(isDesktop) }}
              </p>
              <DirectionsLink
                v-if="start"
                :place="start"
                :label="card().festa.toStart"
                class="mb-4"
              />
              <ol class="space-y-2">
                <li v-for="(point, index) in feste.route" :key="index" class="flex gap-2">
                  <span class="font-semibold">{{ index + 1 }}.</span>
                  <span v-if="point.label" lang="it">{{ point.label }}</span>
                  <span v-else>{{ card().festa.unnamedStop }}</span>
                </li>
              </ol>
            </section>
          </template>

          <!-- A collaborator's controls: Italian, and marked so (review PR-19a). -->
          <template #actions>
            <div v-if="canEdit" class="flex flex-wrap items-center gap-2" lang="it">
              <ActionButton size="small" @click="editing = true">Modifica</ActionButton>
              <ActionButton size="small" button-type="danger" @click="deleteFeste">
                Elimina
              </ActionButton>
              <TranslateControl
                v-if="!feste.translation_of"
                :translate-endpoint="`/api/feste/${feste.id}/traduci/`"
                :translations="feste.translations"
                detail-route-name="festedetail"
              />
            </div>
          </template>
        </CardArticle>
      </template>

      <PanelBox v-else-if="feste" class="mx-auto w-full max-w-3xl" lang="it">
        <FesteForm :feste="feste" @saved="onEdited" @cancel="editing = false" />
      </PanelBox>
    </div>
  </ViewContainer>
</template>
