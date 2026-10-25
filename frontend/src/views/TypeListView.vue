<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import CardGrid from '@/components/content/CardGrid.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import { useUserStore } from '@/stores/user'
import type { TypeConfig } from '@/definitions/typeConfigs'
import type { ContentItem, ZoneRef } from '@/definitions/interfaces/Content'
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
// The whole list's size, not the page's: the menu prints the same number
// beside this heading (review PR-9), and a page holds twenty.
const total = ref(0)
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
    total.value = response.data.count
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

// «Zona · Genere» under the title (review PR-6): the zone leads wherever the
// card carries it by name — chiese and luoghi, since review PR-3. A tour's
// zones are slugs, and its own summary says more.
const zoneOf = (item: ContentItem): string => {
  const first = Array.isArray(item.zones) ? (item.zones[0] as Partial<ZoneRef>) : undefined
  return typeof first?.name === 'string' ? first.name : ''
}

// The grid takes one normalised shape and knows nothing about card types.
const entries = computed(() =>
  items.value.map((item) => ({
    id: item.id,
    title: item.title,
    summary: [
      zoneOf(item),
      props.config.summaryOf
        ? props.config.summaryOf(item)
        : summaryField.value
          ? (item[summaryField.value] as string)
          : '',
    ]
      .filter(Boolean)
      .join(' · '),
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
      <header class="mb-4 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <MainTitle>{{ activeOption?.name_plural ?? config.label }}</MainTitle>
          <p v-if="!loading" class="text-muted">
            {{ total }}
            {{
              total === 1
                ? (config.countNouns?.[0] ?? 'scheda')
                : (config.countNouns?.[1] ?? 'schede')
            }}
          </p>
          <!-- How the list is made, where it owes the reader that: the
          businesses' order is printed, and why they are there (CF40, D10). -->
          <p v-if="config.listNote" class="mt-1 max-w-[60ch] text-sm text-muted">
            {{ config.listNote }}
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

      <!-- The churches' chip is the only way to them from the menu (review
      PR-9), so it stays even while no genre has anything to show. -->
      <nav
        v-if="config.listFilter && (visibleOptions.length || config.listFilter.related?.length)"
        :aria-label="config.listFilter.label"
        class="mb-4 sm:mb-8"
      >
        <!-- On a phone the chips are one row that scrolls, run to the panel's
        edges so it reads as one (review PR-6, M-05): four rows of them put the
        first card under the fold. -->
        <ul
          class="flex gap-2 max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:py-1 sm:flex-wrap"
        >
          <li class="flex-none snap-start">
            <RouterLink
              :to="{ query: {} }"
              class="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
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
          <li v-for="option in visibleOptions" :key="option.slug" class="flex-none snap-start">
            <RouterLink
              :to="{ query: { [config.listFilter.param]: option.slug } }"
              class="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
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
          <li
            v-for="related in config.listFilter.related ?? []"
            :key="related.to"
            class="flex-none snap-start"
          >
            <RouterLink
              :to="related.to"
              class="inline-flex items-center rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            >
              {{ related.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <p v-if="!loading && entries.length === 0" class="text-muted">
        {{ mineOnly ? 'Non hai ancora creato nessuna scheda.' : 'Ancora nessuna scheda.' }}
      </p>

      <CardGrid :entries="entries" :type="config.key" />

      <ActionButton v-if="nextPage" size="small" class="mt-8" @click="loadMore">
        Carica altre
      </ActionButton>
    </div>
  </ViewContainer>
</template>
