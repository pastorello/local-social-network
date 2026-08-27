<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import UserAvatar from '@/components/cards/UserAvatar.vue'
import RichText from '@/components/content/RichText.vue'
import MapPinsEditor from '@/components/content/MapPinsEditor.vue'
import TypeForm from '@/components/content/TypeForm.vue'
import LanguageSwitch from '@/components/content/LanguageSwitch.vue'
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

const createdAtFormatted = computed(() => {
  if (!item.value) return ''
  return new Date(item.value.created_at).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const pins = computed(() => (item.value?.pins as MapPoint[] | undefined) ?? [])

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
  <ViewContainer class="grid-cols-4">
    <div class="col-span-2 col-start-2 space-y-4 self-start">
      <PanelBox v-if="item">
        <template v-if="!editing">
          <LanguageSwitch
            :translations="item.translations"
            :detail-route-name="config.routeNames.detail"
          />

          <div class="mb-2 flex items-center justify-between gap-4">
            <MainTitle>{{ item.title }}</MainTitle>
            <span v-if="!item.is_published" class="text-xs text-gray-500">Bozza</span>
          </div>

          <p class="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <UserAvatar
              :src="item.author.avatarURL"
              :name="item.author.name"
              class="w-6 h-6 rounded-full inline-block object-cover"
            />
            <strong>{{ item.author.name }}</strong> · {{ createdAtFormatted }}
          </p>

          <div v-if="item.images.length > 0" class="flex flex-wrap gap-2 mb-4">
            <img
              v-for="image in item.images"
              :key="image.id"
              :src="image.imageURL"
              class="w-32 h-32 object-cover rounded-xl"
              :alt="image.caption || item.title"
            />
          </div>

          <RichText :html="item.body_html" class="mb-6" />

          <div v-for="field in config.extraFields" :key="field.key">
            <p v-if="item[field.key] && field.kind === 'input'" class="mb-4">
              <strong>{{ field.label }}:</strong> {{ item[field.key] }}
            </p>
            <p v-else-if="item[field.key]" class="mb-4 whitespace-pre-line">
              <strong>{{ field.label }}:</strong><br />{{ item[field.key] }}
            </p>
          </div>

          <MapPinsEditor
            v-if="config.mapMode === 'pins' && pins.length > 0"
            :model-value="pins"
            :max="config.maxPoints ?? 1"
            readonly
            class="mb-6"
          />

          <div class="flex flex-wrap items-center gap-2" v-if="canEdit">
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

        <TypeForm
          v-else
          :config="config"
          :item="item"
          @saved="onEdited"
          @cancel="editing = false"
        />
      </PanelBox>

      <PanelBox>
        <RouterLink :to="{ name: config.routeNames.list }" class="underline"
          >← Torna a {{ config.label.toLowerCase() }}</RouterLink
        >
      </PanelBox>
    </div>
  </ViewContainer>
</template>
