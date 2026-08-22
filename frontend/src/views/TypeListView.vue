<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
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

const endpoint = computed(() => (mineOnly.value ? `${props.config.endpoint}mine/` : props.config.endpoint))

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

const firstImage = (item: ContentItem) => item.images[0]?.imageURL ?? null
const summary = (item: ContentItem) =>
  props.config.extraFields.length > 0 ? (item[props.config.extraFields[0]!.key] as string) : ''

watch(mineOnly, getItems)
watch(() => props.config, getItems)
onMounted(getItems)
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="col-span-2 col-start-2 space-y-4">
      <PanelBox>
        <div class="flex items-center justify-between gap-4 mb-4">
          <MainTitle>{{ config.label }}</MainTitle>
          <RouterLink v-if="userStore.user.isAuthenticated" :to="{ name: config.routeNames.create }">
            <ActionButton size="small">Nuova scheda</ActionButton>
          </RouterLink>
        </div>

        <label v-if="userStore.user.isAuthenticated" class="flex items-center gap-2 mb-4">
          <input type="checkbox" v-model="mineOnly" />
          Le mie
        </label>

        <p v-if="!loading && items.length === 0" class="text-gray-500">
          {{ mineOnly ? 'Non hai ancora creato nessuna scheda.' : 'Nessuna scheda pubblicata.' }}
        </p>

        <ul class="space-y-4">
          <li v-for="item in items" :key="item.id">
            <RouterLink
              :to="{ name: config.routeNames.detail, params: { id: item.id } }"
              class="flex items-center gap-4 hover:bg-gray-50 rounded-lg p-2"
            >
              <img
                v-if="firstImage(item)"
                :src="firstImage(item) ?? undefined"
                class="w-16 h-16 object-cover rounded-lg"
                alt=""
              />
              <div>
                <p class="font-semibold">
                  {{ item.title }}
                  <span v-if="!item.is_published" class="text-xs text-gray-500">(bozza)</span>
                </p>
                <p v-if="summary(item)" class="text-sm text-gray-500">{{ summary(item) }}</p>
              </div>
            </RouterLink>
          </li>
        </ul>

        <ActionButton v-if="nextPage" size="small" class="mt-4" @click="loadMore">
          Carica altre
        </ActionButton>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
