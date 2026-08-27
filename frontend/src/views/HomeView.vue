<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import GaetaMap from '@/components/maps/GaetaMap.vue'
import ReportForm from '@/components/reports/ReportForm.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import SearchBar from '@/components/forms/SearchBar.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type Category from '@/definitions/interfaces/Category'
import type { MapCardFeature, Overlay } from '@/definitions/interfaces/MapData'
import type { ReportPin, ReportStatus } from '@/definitions/interfaces/Report'
import { CARD_LAYERS, REPORTS_LAYER_KEY, layerColor, layerRoute } from '@/lib/mapLayers'
import { STATUS_META, statusColor } from '@/lib/reportStatus'

const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const categories = ref<Category[]>([])
const pins = ref<ReportPin[]>([])
const features = ref<MapCardFeature[]>([])
const overlays = ref<Overlay[]>([])

// Spec map.md M1/M2: the map is the landing view and every layer is the
// reader's to toggle. All on by default — the first thing a visitor should
// see is how much of the city is on the map.
const activeLayers = ref<Record<string, boolean>>(
  Object.fromEntries([...CARD_LAYERS.map((layer) => [layer.key, true]), [REPORTS_LAYER_KEY, true]]),
)
const activeOverlays = ref<Record<string, boolean>>({})
const overlayOpacity = ref<Record<string, number>>({})

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

const visibleFeatures = computed(() =>
  features.value.filter((feature) => activeLayers.value[feature.type]),
)
const visiblePins = computed(() => (activeLayers.value[REPORTS_LAYER_KEY] ? pins.value : []))
const visibleOverlays = computed(() =>
  overlays.value
    .filter((overlay) => activeOverlays.value[overlay.id])
    .map((overlay) => ({
      ...overlay,
      opacity: overlayOpacity.value[overlay.id] ?? overlay.opacity,
    })),
)

const featureCount = (key: string) =>
  features.value.filter((feature) => feature.type === key).length

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

const getFeatures = async () => {
  await axios
    .get('/api/map/features/')
    .then((response) => {
      features.value = response.data
    })
    .catch((error) => {
      console.log('error', error)
    })
}

// What comes back depends on who is asking — the server decides (spec
// politics.md). The SPA neither knows nor asks: it draws the list it is given.
const getOverlays = async () => {
  await axios
    .get('/api/map/overlays/')
    .then((response) => {
      overlays.value = response.data
      for (const overlay of overlays.value) {
        if (!(overlay.id in overlayOpacity.value))
          overlayOpacity.value[overlay.id] = overlay.opacity
      }
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
  activeLayers.value[REPORTS_LAYER_KEY] = true
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

const onFeatureClick = (feature: { type: string; id: string }) => {
  router.push(layerRoute(feature.type, feature.id))
}

const onReportSaved = () => {
  cancelReporting()
  getPins()
}

// Logging in or out changes which overlays exist for this reader.
watch(() => userStore.user.isAuthenticated, getOverlays)

onMounted(() => {
  getCategories()
  getPins()
  getFeatures()
  getOverlays()
})
</script>

<template>
  <ViewContainer class="grid-cols-6">
    <!-- self-start: PanelBox is h-full; a stacked column must not stretch to row height -->
    <div class="col-span-2 space-y-4 self-start">
      <PanelBox>
        <MainTitle>La mappa di Gaeta</MainTitle>
        <p class="mb-4 text-gray-500">
          Feste, chiese, ricette e personaggi della città, sulla mappa. Scegli cosa vedere.
        </p>

        <fieldset class="space-y-2">
          <legend class="mb-2 text-lg font-semibold">Livelli</legend>
          <div v-for="layer in CARD_LAYERS" :key="layer.key" class="flex items-center gap-2">
            <input
              :id="`layer-${layer.key}`"
              v-model="activeLayers[layer.key]"
              type="checkbox"
              class="h-4 w-4"
            />
            <span
              class="inline-block w-3 h-3 rounded-full"
              :style="{ backgroundColor: layerColor(layer.key) }"
              aria-hidden="true"
            ></span>
            <label :for="`layer-${layer.key}`" class="text-sm text-gray-700">
              {{ layer.label }}
              <span class="text-gray-400">({{ featureCount(layer.key) }})</span>
            </label>
          </div>
          <div class="flex items-center gap-2">
            <input
              id="layer-segnalazioni"
              v-model="activeLayers[REPORTS_LAYER_KEY]"
              type="checkbox"
              class="h-4 w-4"
            />
            <span
              class="inline-block w-3 h-3 rounded-full"
              :style="{ backgroundColor: statusColor('open') }"
              aria-hidden="true"
            ></span>
            <label for="layer-segnalazioni" class="text-sm text-gray-700">
              Segnalazioni
              <span class="text-gray-400">({{ pins.length }})</span>
            </label>
          </div>
        </fieldset>

        <fieldset v-if="overlays.length" class="mt-6 space-y-3">
          <legend class="mb-2 text-lg font-semibold">Sovrapposizioni</legend>
          <div v-for="overlay in overlays" :key="overlay.id" class="space-y-1">
            <div class="flex items-center gap-2">
              <input
                :id="`overlay-${overlay.id}`"
                v-model="activeOverlays[overlay.id]"
                type="checkbox"
                class="h-4 w-4"
              />
              <label :for="`overlay-${overlay.id}`" class="text-sm text-gray-700">
                {{ overlay.name }}
              </label>
            </div>
            <div v-if="activeOverlays[overlay.id]" class="flex items-center gap-2 pl-6">
              <label :for="`overlay-opacity-${overlay.id}`" class="text-xs text-gray-500">
                Opacità
              </label>
              <input
                :id="`overlay-opacity-${overlay.id}`"
                v-model.number="overlayOpacity[overlay.id]"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="flex-1"
              />
            </div>
          </div>
        </fieldset>
      </PanelBox>

      <PanelBox v-if="visibleFeatures.length">
        <h2 class="mb-1 text-lg font-semibold">Luoghi sulla mappa</h2>
        <!-- The clickable pin has no keyboard equivalent (ADR-0005 defers full
             map-widget operability); this list is that equivalent. -->
        <p class="mb-3 text-xs text-gray-500">Gli stessi luoghi disegnati sulla mappa.</p>
        <ul class="space-y-1">
          <li v-for="feature in visibleFeatures" :key="feature.id">
            <RouterLink
              :to="layerRoute(feature.type, feature.id)"
              class="text-sm text-sea underline"
            >
              {{ feature.title }}
            </RouterLink>
          </li>
        </ul>
      </PanelBox>

      <PanelBox v-if="activeLayers[REPORTS_LAYER_KEY]">
        <h2 class="mb-4 text-lg font-semibold">Segnalazioni</h2>

        <template v-if="!placing">
          <p class="mb-4 text-gray-500">
            Esplora i problemi segnalati dai cittadini di Gaeta o invia la tua segnalazione.
          </p>
          <ActionButton @click="startReporting">Segnala un problema</ActionButton>
        </template>

        <template v-else>
          <p class="mb-4 font-semibold text-gray-700">Clicca sulla mappa nel punto del problema.</p>

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
              <p class="text-xs text-gray-500">
                In alternativa al clic sulla mappa (es. da tastiera).
              </p>
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
                class="text-sm bg-sea text-white rounded px-3 py-2 cursor-pointer"
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

        <template v-if="!placing">
          <h3 class="mt-6 mb-4 text-base font-semibold">Filtri</h3>

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
                :style="{ backgroundColor: statusColor(option.value) }"
              ></span>
              {{ option.label }}
            </p>
          </div>
        </template>
      </PanelBox>
    </div>

    <div class="col-span-4">
      <PanelBox>
        <div class="h-[36rem]">
          <GaetaMap
            :pins="visiblePins"
            :features="visibleFeatures"
            :overlays="visibleOverlays"
            :placing="placing"
            @map-click="onMapClick"
            @pin-click="onPinClick"
            @feature-click="onFeatureClick"
          />
        </div>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
