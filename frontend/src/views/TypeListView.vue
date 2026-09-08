<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'

import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import CardGrid from '@/components/content/CardGrid.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import { layerColor } from '@/lib/mapLayers'
import { useUserStore } from '@/stores/user'
import type { TypeConfig } from '@/definitions/typeConfigs'
import type { ContentItem } from '@/definitions/interfaces/Content'

const props = defineProps<{ config: TypeConfig }>()

interface PaginatedItems {
  count: number
  next: string | null
  previous: string | null
  results: ContentItem[]
}

const userStore = useUserStore()

const items = ref<ContentItem[]>([])
const nextPage = ref<string | null>(null)
const loading = ref(true)
const mineOnly = ref(false)

const endpoint = computed(() =>
  mineOnly.value ? `${props.config.endpoint}mine/` : props.config.endpoint,
)

const getItems = async () => {
  loading.value = true
  try {
    const response = await axios.get<PaginatedItems>(endpoint.value)
    items.value = response.data.results
    nextPage.value = response.data.next
  } catch (error) {
    console.log('error:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!nextPage.value) return
  const response = await axios.get<PaginatedItems>(nextPage.value)
  items.value = [...items.value, ...response.data.results]
  nextPage.value = response.data.next
}

// The grid takes one normalised shape and knows nothing about card types.
const entries = computed(() =>
  items.value.map((item) => ({
    id: item.id,
    title: item.title,
    summary:
      props.config.extraFields.length > 0 ? (item[props.config.extraFields[0]!.key] as string) : '',
    cover: item.images[0]?.imageURL ?? null,
    isPublished: item.is_published,
    to: { name: props.config.routeNames.detail, params: { id: item.id } },
  })),
)

watch(mineOnly, getItems)
watch(() => props.config, getItems)
onMounted(getItems)
</script>

<template>
  <ViewContainer class="grid-cols-1">
    <div class="mx-auto w-full max-w-6xl">
      <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <MainTitle>{{ config.label }}</MainTitle>
          <p v-if="!loading" class="text-muted">
            {{ entries.length }} {{ entries.length === 1 ? 'scheda' : 'schede' }}
          </p>
        </div>

        <div v-if="userStore.user.isAuthenticated" class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-ink" :for="`mine-${config.key}`">
            <input :id="`mine-${config.key}`" v-model="mineOnly" type="checkbox" class="h-4 w-4" />
            Le mie
          </label>
          <ActionButton size="small" :to="{ name: config.routeNames.create }">
            Nuova scheda
          </ActionButton>
        </div>
      </header>

      <p v-if="!loading && entries.length === 0" class="text-muted">
        {{ mineOnly ? 'Non hai ancora creato nessuna scheda.' : 'Nessuna scheda pubblicata.' }}
      </p>

      <CardGrid :entries="entries" :placeholder="layerColor(config.key)" />

      <ActionButton v-if="nextPage" size="small" class="mt-8" @click="loadMore">
        Carica altre
      </ActionButton>
    </div>
  </ViewContainer>
</template>
