<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import CardGrid from '@/components/content/CardGrid.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import { layerColor } from '@/lib/mapLayers'
import { useUserStore } from '@/stores/user'
import type { TypeConfig } from '@/definitions/typeConfigs'
import type { ContentItem } from '@/definitions/interfaces/Content'
import type { Genre } from '@/definitions/interfaces/Luogo'

const props = defineProps<{ config: TypeConfig }>()

interface PaginatedItems {
  count: number
  next: string | null
  previous: string | null
  results: ContentItem[]
}

const userStore = useUserStore()
const route = useRoute()

const items = ref<ContentItem[]>([])
const nextPage = ref<string | null>(null)
const loading = ref(true)
const mineOnly = ref(false)

// The list's filter lives in the URL (`/luoghi?genere=spiaggia`), so a heading
// anywhere else — the menu, a card, an itinerary — can link straight to
// "Spiagge", and Back undoes a choice.
const filterOptions = ref<Genre[]>([])
const activeFilter = computed(() => {
  const param = props.config.listFilter?.param
  const value = param ? route.query[param] : undefined
  return typeof value === 'string' ? value : ''
})
const activeOption = computed(() =>
  filterOptions.value.find((option) => option.slug === activeFilter.value),
)
// A heading with nothing under it is noise; the active one always stays, so the
// reader can see what they are looking at even when it is empty.
const visibleOptions = computed(() =>
  filterOptions.value.filter((option) => option.count > 0 || option.slug === activeFilter.value),
)

const getFilterOptions = async () => {
  if (!props.config.listFilter) return
  try {
    const response = await axios.get<Genre[]>(props.config.listFilter.optionsEndpoint)
    filterOptions.value = response.data
  } catch (error) {
    console.log('error:', error)
  }
}

const endpoint = computed(() => {
  const base = mineOnly.value ? `${props.config.endpoint}mine/` : props.config.endpoint
  const param = props.config.listFilter?.param
  return param && activeFilter.value
    ? `${base}?${param}=${encodeURIComponent(activeFilter.value)}`
    : base
})

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

// The first extra field is the card's one-line summary in the grid — read
// through its display key, so a luogo shows "Spiaggia" rather than a slug.
const summaryField = computed(() => {
  const first = props.config.extraFields[0]
  return first ? (first.displayKey ?? first.key) : ''
})

// The grid takes one normalised shape and knows nothing about card types.
const entries = computed(() =>
  items.value.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summaryField.value ? (item[summaryField.value] as string) : '',
    cover: item.images[0]?.imageURL ?? null,
    isPublished: item.is_published,
    to: { name: props.config.routeNames.detail, params: { id: item.id } },
  })),
)

watch(mineOnly, getItems)
watch(activeFilter, getItems)
watch(
  () => props.config,
  () => {
    getItems()
    getFilterOptions()
  },
)
onMounted(() => {
  getItems()
  getFilterOptions()
})
</script>

<template>
  <ViewContainer class="grid-cols-1">
    <div class="mx-auto w-full max-w-6xl">
      <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <MainTitle>{{ activeOption?.name_plural ?? config.label }}</MainTitle>
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

      <nav
        v-if="config.listFilter && visibleOptions.length"
        :aria-label="config.listFilter.label"
        class="mb-8"
      >
        <ul class="flex flex-wrap gap-2">
          <li>
            <RouterLink
              :to="{ query: {} }"
              class="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              :class="
                activeFilter
                  ? 'border-hairline bg-surface text-ink'
                  : 'border-sea bg-sea text-white'
              "
              :aria-current="activeFilter ? undefined : 'page'"
            >
              Tutti
            </RouterLink>
          </li>
          <li v-for="option in visibleOptions" :key="option.slug">
            <RouterLink
              :to="{ query: { [config.listFilter.param]: option.slug } }"
              class="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              :class="
                option.slug === activeFilter
                  ? 'border-sea bg-sea text-white'
                  : 'border-hairline bg-surface text-ink'
              "
              :aria-current="option.slug === activeFilter ? 'page' : undefined"
            >
              {{ option.name_plural }}
            </RouterLink>
          </li>
          <li v-for="related in config.listFilter.related ?? []" :key="related.to">
            <RouterLink
              :to="related.to"
              class="inline-flex items-center rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            >
              {{ related.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>

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
