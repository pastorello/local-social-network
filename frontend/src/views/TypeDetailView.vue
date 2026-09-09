<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import CardArticle from '@/components/content/CardArticle.vue'
import MapPinsEditor from '@/components/content/MapPinsEditor.vue'
import TypeForm from '@/components/content/TypeForm.vue'
import TranslateControl from '@/components/content/TranslateControl.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type { TypeConfig } from '@/definitions/typeConfigs'
import type { ContentItem, MapPoint } from '@/definitions/interfaces/Content'

const props = defineProps<{ config: TypeConfig }>()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const item = ref<ContentItem | null>(null)
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

const filledFields = computed(() =>
  props.config.extraFields.filter((field) => Boolean(item.value?.[field.key])),
)

const getItem = async () => {
  await axios
    .get(`${props.config.endpoint}${route.params.id}/`)
    .then((response) => {
      item.value = response.data
    })
    .catch(() => {
      toastStore.showToast(5000, 'Scheda non trovata', 'bg-red-300')
      router.push({ name: props.config.routeNames.list })
    })
}

const onEdited = (updated: ContentItem) => {
  item.value = updated
  editing.value = false
}

const deleteItem = async () => {
  if (!item.value) return
  if (!window.confirm('Vuoi davvero eliminare questa scheda?')) return

  await axios
    .delete(`${props.config.endpoint}${item.value.id}/`)
    .then(() => {
      toastStore.showToast(5000, 'Scheda eliminata', 'bg-emerald-500')
      router.push({ name: props.config.routeNames.list })
    })
    .catch(() => {
      toastStore.showToast(5000, 'Impossibile eliminare la scheda.', 'bg-red-300')
    })
}

onMounted(getItem)

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
    await getItem()
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
          :type-label="config.singularLabel"
          :detail-route-name="config.routeNames.detail"
          :back-to="{ name: config.routeNames.list, label: config.label.toLowerCase() }"
        >
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
                <dd class="whitespace-pre-line text-ink">{{ item![field.key] }}</dd>
              </div>
            </dl>
          </template>

          <template #map>
            <section v-if="config.mapMode === 'pins' && pins.length > 0" class="mb-10">
              <h2 class="mb-3 font-display text-title text-ink">Dove si trova</h2>
              <MapPinsEditor :model-value="pins" :max="config.maxPoints ?? 1" readonly />
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
