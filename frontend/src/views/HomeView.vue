<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import ReportsMap from '@/components/maps/ReportsMap.vue'
import ReportForm from '@/components/reports/ReportForm.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import SearchBar from '@/components/forms/SearchBar.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type Category from '@/definitions/interfaces/Category'
import type { ReportPin, ReportStatus } from '@/definitions/interfaces/Report'
import { STATUS_META } from '@/lib/reportStatus'

const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const categories = ref<Category[]>([])
const pins = ref<ReportPin[]>([])

const q = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')

const placing = ref(false)
const draftCoords = ref<{ lat: number; lng: number } | null>(null)
const manualLat = ref('')
const manualLng = ref('')

const statusOptions = (Object.keys(STATUS_META) as ReportStatus[]).map((status) => ({
  value: status,
  label: STATUS_META[status].label,
}))

const getCategories = async () => {
  await axios
    .get('/api/categories/')
    .then((response) => {
      categories.value = response.data
    })
    .catch((error) => {
      console.log('error', error)
    })
}

const getPins = async () => {
  const params: Record<string, string> = {}
  if (q.value) params.q = q.value
  if (categoryFilter.value) params.category = categoryFilter.value
  if (statusFilter.value) params.status = statusFilter.value

  await axios
    .get('/api/reports/map/', { params })
    .then((response) => {
      pins.value = response.data
    })
    .catch((error) => {
      console.log('error', error)
    })
}

const startReporting = () => {
  if (!userStore.user.isAuthenticated) {
    toastStore.showToast(5000, 'Accedi per inviare una segnalazione', 'bg-red-300')
    router.push('/login')
    return
  }
  placing.value = true
  draftCoords.value = null
}

const cancelReporting = () => {
  placing.value = false
  draftCoords.value = null
}

const onMapClick = (coords: { lat: number; lng: number }) => {
  draftCoords.value = coords
}

// The map click is the fast path but has no keyboard equivalent — this is
// the one for anyone who can't (or doesn't want to) use a pointer (WCAG 2.1.1).
const useManualCoords = () => {
  const lat = Number(manualLat.value)
  const lng = Number(manualLng.value)
  if (!manualLat.value || !manualLng.value || Number.isNaN(lat) || Number.isNaN(lng)) return
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return

  draftCoords.value = { lat, lng }
}

const onPinClick = (id: string) => {
  router.push(`/reports/${id}`)
}

const onReportSaved = () => {
  cancelReporting()
  getPins()
}

onMounted(() => {
  getCategories()
  getPins()
})
</script>

<template>
  <ViewContainer class="grid-cols-6">
    <!-- self-start: PanelBox is h-full; a stacked column must not stretch to row height -->
    <div class="col-span-2 space-y-4 self-start">
      <PanelBox>
        <MainTitle>Segnalazioni</MainTitle>

        <template v-if="!placing">
          <p class="mb-4 text-gray-500">
            Esplora i problemi segnalati dai cittadini di Gaeta o invia la tua segnalazione.
          </p>
          <ActionButton @click="startReporting">Segnala un problema</ActionButton>
        </template>

        <template v-else>
          <p class="mb-4 font-semibold text-gray-700">
            Clicca sulla mappa nel punto del problema.
          </p>

          <ReportForm
            v-if="draftCoords"
            :categories="categories"
            :coords="draftCoords"
            @saved="onReportSaved"
            @cancel="cancelReporting"
          />
          <template v-else>
            <fieldset class="mb-4 border border-gray-200 rounded-lg p-3 space-y-2">
              <legend class="text-sm font-semibold px-1">Oppure inserisci le coordinate</legend>
              <p class="text-xs text-gray-500">In alternativa al clic sulla mappa (es. da tastiera).</p>
              <div class="flex gap-2">
                <label class="sr-only" for="report-manual-lat">Latitudine</label>
                <input
                  id="report-manual-lat"
                  v-model="manualLat"
                  type="text"
                  inputmode="decimal"
                  placeholder="Latitudine"
                  class="w-1/2 p-2 border border-gray-200 rounded text-sm"
                />
                <label class="sr-only" for="report-manual-lng">Longitudine</label>
                <input
                  id="report-manual-lng"
                  v-model="manualLng"
                  type="text"
                  inputmode="decimal"
                  placeholder="Longitudine"
                  class="w-1/2 p-2 border border-gray-200 rounded text-sm"
                />
              </div>
              <button
                type="button"
                class="text-sm bg-purple-600 text-white rounded px-3 py-2 cursor-pointer"
                @click="useManualCoords"
              >
                Usa queste coordinate
              </button>
            </fieldset>
            <button
              type="button"
              class="py-4 px-6 rounded-lg bg-gray-200 text-gray-700 cursor-pointer"
              @click="cancelReporting"
            >
              Annulla
            </button>
          </template>
        </template>
      </PanelBox>

      <PanelBox v-if="!placing">
        <h2 class="mb-4 text-lg font-semibold">Filtri</h2>

        <SearchBar v-model="q" @submit="getPins" placeholder="Cerca per titolo..." />

        <div class="space-y-3">
          <select
            v-model="categoryFilter"
            class="p-4 w-full bg-gray-100 rounded-lg"
            aria-label="Filtra per categoria"
            @change="getPins"
          >
            <option value="">Tutte le categorie</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>

          <select
            v-model="statusFilter"
            class="p-4 w-full bg-gray-100 rounded-lg"
            aria-label="Filtra per stato"
            @change="getPins"
          >
            <option value="">Tutti gli stati</option>
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="mt-6 space-y-2">
          <p
            v-for="option in statusOptions"
            :key="option.value"
            class="flex items-center gap-2 text-sm text-gray-600"
          >
            <span
              class="inline-block w-3 h-3 rounded-full"
              :style="{ backgroundColor: STATUS_META[option.value].color }"
            ></span>
            {{ option.label }}
          </p>
        </div>
      </PanelBox>
    </div>

    <div class="col-span-4">
      <PanelBox>
        <div class="h-[36rem]">
          <ReportsMap
            :pins="pins"
            :placing="placing"
            @map-click="onMapClick"
            @pin-click="onPinClick"
          />
        </div>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
