<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import GaetaMap from '@/components/maps/GaetaMap.vue'
import LayerToggles from '@/components/maps/LayerToggles.vue'
import MapChrome from '@/components/maps/MapChrome.vue'
import MapSheet from '@/components/maps/MapSheet.vue'
import PlacesList from '@/components/maps/PlacesList.vue'
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
import { useIsDesktop } from '@/composables/useBreakpoint'
import { CARD_LAYERS, REPORTS_LAYER_KEY, layerRoute } from '@/lib/mapLayers'
import { STATUS_META, statusColor } from '@/lib/reportStatus'

// Two layouts, not one stretched over both (spec/design.md D2): the reader's
// home is designed small-first, the collaborator's panels large-first. Only
// one of them is ever in the DOM — see useBreakpoint for why that matters
// beyond tidiness.
const { isDesktop } = useIsDesktop()

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
// Mobile only: the floating layer panel and the sheet both sit over the map,
// so opening one gets the other out of the way.
const chromeOpen = ref(false)
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
  <!-- ============ the reader's home, small-first (D3/D4/D5) ============ -->
  <div
    v-if="!isDesktop"
    class="relative -mx-4 -mt-4 h-[calc(100dvh-var(--header-h,10rem))] overflow-hidden"
  >
    <!-- The page still needs its one h1 (ADR-0005), and the small-first home
    has no room to show one: here the map *is* the title. Visually hidden is
    the honest answer — someone on a screen reader gets the page identity that
    a sighted reader gets from the map filling the screen. -->
    <h1 class="sr-only">La mappa di Gaeta</h1>

    <GaetaMap
      :pins="visiblePins"
      :features="visibleFeatures"
      :overlays="visibleOverlays"
      :placing="placing"
      @map-click="onMapClick"
      @pin-click="onPinClick"
      @feature-click="onFeatureClick"
    />

    <MapChrome v-model:open="chromeOpen">
      <LayerToggles
        v-model:active-layers="activeLayers"
        v-model:active-overlays="activeOverlays"
        v-model:overlay-opacity="overlayOpacity"
        :overlays="overlays"
        :feature-count="featureCount"
        :report-count="pins.length"
      />
    </MapChrome>

    <MapSheet
      title="Luoghi sulla mappa"
      :subtitle="`${visibleFeatures.length} schede`"
      :force-peek="chromeOpen"
    >
      <PlacesList v-if="visibleFeatures.length" :features="visibleFeatures" />
      <p v-else class="py-6 text-sm text-muted">
        Nessun livello attivo: apri «Livelli» per scegliere cosa vedere.
      </p>

      <div v-if="activeLayers[REPORTS_LAYER_KEY]" class="mt-6 border-t border-hairline pt-4">
        <h2 class="mb-2 font-display text-title">Segnalazioni</h2>
        <template v-if="!placing">
          <p class="mb-3 text-sm text-muted">
            Esplora i problemi segnalati dai cittadini di Gaeta o invia la tua segnalazione.
          </p>
          <ActionButton @click="startReporting">Segnala un problema</ActionButton>
        </template>
        <template v-else>
          <p class="mb-3 text-sm font-semibold text-ink">Tocca la mappa nel punto del problema.</p>
          <ReportForm
            v-if="draftCoords"
            :categories="categories"
            :coords="draftCoords"
            @saved="onReportSaved"
            @cancel="cancelReporting"
          />
          <button
            v-else
            type="button"
            class="rounded-lg bg-gray-200 px-6 py-3 text-sm text-gray-700"
            @click="cancelReporting"
          >
            Annulla
          </button>
        </template>
      </div>
    </MapSheet>
  </div>

  <!-- ============ the collaborator's home, large-first ============ -->
  <ViewContainer v-else class="grid-cols-6">
    <!-- self-start: PanelBox is h-full; a stacked column must not stretch to row height -->
    <div class="col-span-2 space-y-4 self-start">
      <PanelBox>
        <MainTitle>La mappa di Gaeta</MainTitle>
        <p class="mb-4 text-muted">
          Feste, chiese, ricette e personaggi della città, sulla mappa. Scegli cosa vedere.
        </p>

        <LayerToggles
          v-model:active-layers="activeLayers"
          v-model:active-overlays="activeOverlays"
          v-model:overlay-opacity="overlayOpacity"
          :overlays="overlays"
          :feature-count="featureCount"
          :report-count="pins.length"
        />
      </PanelBox>

      <PanelBox v-if="visibleFeatures.length">
        <h2 class="mb-1 font-display text-title">Luoghi sulla mappa</h2>
        <p class="mb-3 text-xs text-muted">Gli stessi luoghi disegnati sulla mappa.</p>
        <PlacesList :features="visibleFeatures" />
      </PanelBox>

      <PanelBox v-if="activeLayers[REPORTS_LAYER_KEY]">
        <h2 class="mb-4 font-display text-title">Segnalazioni</h2>

        <template v-if="!placing">
          <p class="mb-4 text-muted">
            Esplora i problemi segnalati dai cittadini di Gaeta o invia la tua segnalazione.
          </p>
          <ActionButton @click="startReporting">Segnala un problema</ActionButton>
        </template>

        <template v-else>
          <p class="mb-4 font-semibold text-ink">Clicca sulla mappa nel punto del problema.</p>

          <ReportForm
            v-if="draftCoords"
            :categories="categories"
            :coords="draftCoords"
            @saved="onReportSaved"
            @cancel="cancelReporting"
          />
          <template v-else>
            <fieldset class="mb-4 space-y-2 rounded-lg border border-hairline p-3">
              <legend class="px-1 text-sm font-semibold">Oppure inserisci le coordinate</legend>
              <p class="text-xs text-muted">
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
                  class="w-1/2 rounded border border-field p-2 text-sm"
                />
                <label class="sr-only" for="report-manual-lng">Longitudine</label>
                <input
                  id="report-manual-lng"
                  v-model="manualLng"
                  type="text"
                  inputmode="decimal"
                  placeholder="Longitudine"
                  class="w-1/2 rounded border border-field p-2 text-sm"
                />
              </div>
              <button
                type="button"
                class="cursor-pointer rounded bg-sea px-3 py-2 text-sm text-white"
                @click="useManualCoords"
              >
                Usa queste coordinate
              </button>
            </fieldset>
            <button
              type="button"
              class="cursor-pointer rounded-lg bg-gray-200 px-6 py-4 text-gray-700"
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
              class="w-full rounded-lg bg-gray-100 p-4"
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
              class="w-full rounded-lg bg-gray-100 p-4"
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
              class="flex items-center gap-2 text-sm text-muted"
            >
              <span
                class="inline-block h-3 w-3 rounded-full"
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
