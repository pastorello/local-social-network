<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'

import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import CardGrid from '@/components/content/CardGrid.vue'
import { layerColor } from '@/lib/mapLayers'
import MainTitle from '@/components/typography/MainTitle.vue'
import { useUserStore } from '@/stores/user'
import type Feste from '@/definitions/interfaces/Feste'

interface PaginatedFeste {
  count: number
  next: string | null
  previous: string | null
  results: Feste[]
}

const userStore = useUserStore()

const feste = ref<Feste[]>([])
const nextPage = ref<string | null>(null)
const loading = ref(true)
const mineOnly = ref(false)

const endpoint = computed(() => (mineOnly.value ? '/api/feste/mine/' : '/api/feste/'))

const getFeste = async () => {
  loading.value = true
  try {
    const response = await axios.get<PaginatedFeste>(endpoint.value)
    feste.value = response.data.results
    nextPage.value = response.data.next
  } catch (error) {
    console.log('error:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!nextPage.value) return
  const response = await axios.get<PaginatedFeste>(nextPage.value)
  feste.value = [...feste.value, ...response.data.results]
  nextPage.value = response.data.next
}

const entries = computed(() =>
  feste.value.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.recurrence,
    cover: item.images[0]?.imageURL ?? null,
    isPublished: item.is_published,
    to: { name: 'festedetail', params: { id: item.id } },
  })),
)

watch(mineOnly, getFeste)
onMounted(getFeste)
</script>

<template>
  <ViewContainer class="grid-cols-1">
    <div class="mx-auto w-full max-w-6xl">
      <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <MainTitle>Feste</MainTitle>
          <p v-if="!loading" class="text-muted">
            {{ entries.length }} {{ entries.length === 1 ? 'scheda' : 'schede' }}
          </p>
        </div>

        <div v-if="userStore.user.isAuthenticated" class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-ink" for="mine-feste">
            <input id="mine-feste" v-model="mineOnly" type="checkbox" class="h-4 w-4" />
            Le mie
          </label>
          <RouterLink :to="{ name: 'festecreate' }">
            <ActionButton size="small">Nuova festa</ActionButton>
          </RouterLink>
        </div>
      </header>

      <p v-if="!loading && entries.length === 0" class="text-muted">
        {{ mineOnly ? 'Non hai ancora creato nessuna festa.' : 'Nessuna festa pubblicata.' }}
      </p>

      <CardGrid :entries="entries" :placeholder="layerColor('feste')" />

      <ActionButton v-if="nextPage" size="small" class="mt-8" @click="loadMore">
        Carica altre
      </ActionButton>
    </div>
  </ViewContainer>
</template>
