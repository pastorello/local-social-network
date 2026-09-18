<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import LayerToggles from '@/components/maps/LayerToggles.vue'
import MapChrome from '@/components/maps/MapChrome.vue'
import MapSheet from '@/components/maps/MapSheet.vue'
import PlacesList from '@/components/maps/PlacesList.vue'
import ReportsList from '@/components/maps/ReportsList.vue'
import ReportForm from '@/components/reports/ReportForm.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import SearchBar from '@/components/forms/SearchBar.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import { useMapStore } from '@/stores/map'
import type { ReportStatus } from '@/definitions/interfaces/Report'
import { useIsDesktop } from '@/composables/useBreakpoint'
import { REPORTS_LAYER_KEY } from '@/lib/mapLayers'
import { STATUS_META, statusColor } from '@/lib/reportStatus'

// The home's chrome — what floats over the map when no page is open. The map
// itself is the shell's (spec/design.md D13, MapStage.vue), and what it shows
// is stores/map.ts: the toggles here change the store, and the map follows.
//
// Two layouts, not one stretched over both (D2): the reader's home is designed
// small-first, the collaborator's large-first. Only one of them is ever in the
// DOM — see useBreakpoint for why that matters beyond tidiness.
const { isDesktop } = useIsDesktop()

const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()
const mapStore = useMapStore()
const {
  activeLayers,
  activeOverlays,
  overlayOpacity,
  overlays,
  pins,
  categories,
  visibleFeatures,
  visiblePins,
  placing,
  draftCoords,
  q,
  categoryFilter,
  statusFilter,
} = storeToRefs(mapStore)

// Mobile only: the floating layer panel and the sheet both sit over the map,
// so opening one gets the other out of the way.
const chromeOpen = ref(false)

const manualLat = ref('')
const manualLng = ref('')

const statusOptions = (Object.keys(STATUS_META) as ReportStatus[]).map((status) => ({
  value: status,
  label: STATUS_META[status].label,
}))

const featureCount = (key: string) => mapStore.featureCount(key)

const startReporting = () => {
  if (!userStore.user.isAuthenticated) {
    toastStore.showToast(5000, 'Accedi per inviare una segnalazione', 'bg-red-300')
    router.push('/login')
    return
  }
  mapStore.startPlacing()
}

const cancelReporting = () => {
  mapStore.stopPlacing()
}

// The map click is the fast path but has no keyboard equivalent — this is
// the one for anyone who can't (or doesn't want to) use a pointer (WCAG 2.1.1).
const useManualCoords = () => {
  const lat = Number(manualLat.value)
  const lng = Number(manualLng.value)
  if (!manualLat.value || !manualLng.value || Number.isNaN(lat) || Number.isNaN(lng)) return
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return

  mapStore.draftCoords = { lat, lng }
}

const onReportSaved = () => {
  cancelReporting()
  mapStore.fetchPins()
}

// The shell loads the map's data too; this makes the chrome self-sufficient
// (and is a no-op once loaded).
onMounted(mapStore.load)
</script>

<template>
  <!-- ============ the reader's home, small-first (D3/D4/D5) ============ -->
  <div v-if="!isDesktop" class="absolute inset-0 overflow-hidden">
    <!-- The page still needs its one h1 (ADR-0005), and the small-first home
    has no room to show one: here the map *is* the title. Visually hidden is
    the honest answer — someone on a screen reader gets the page identity that
    a sighted reader gets from the map filling the screen. -->
    <h1 class="sr-only">La mappa di Gaeta</h1>

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
      class="pointer-events-auto"
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

          <ReportsList v-if="visiblePins.length" :pins="visiblePins" class="mt-4" />
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

  <!-- ============ the wide home, large-first ============ -->
  <!-- A column floating over the map rather than a column beside it (D13):
  the map is the page. Each PanelBox sits in its own block: PanelBox is h-full,
  and a column with a height would otherwise stretch every box to it. -->
  <div
    v-else
    class="pointer-events-auto absolute top-4 bottom-4 left-4 w-[26rem] space-y-4 overflow-y-auto pr-1"
  >
    <div>
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
    </div>

    <div v-if="visibleFeatures.length">
      <PanelBox>
        <h2 class="mb-1 font-display text-title">Luoghi sulla mappa</h2>
        <p class="mb-3 text-xs text-muted">Gli stessi luoghi disegnati sulla mappa.</p>
        <PlacesList :features="visibleFeatures" />
      </PanelBox>
    </div>

    <div v-if="activeLayers[REPORTS_LAYER_KEY]">
      <PanelBox>
        <h2 class="mb-4 font-display text-title">Segnalazioni</h2>

        <template v-if="!placing">
          <p class="mb-4 text-muted">
            Esplora i problemi segnalati dai cittadini di Gaeta o invia la tua segnalazione.
          </p>
          <ActionButton @click="startReporting">Segnala un problema</ActionButton>

          <!-- The same reports the map is drawing, as links: the keyboard path
          a clickable pin does not have (ADR-0005, closed 2026-09-05).

          Bounded in height, not in length: the map endpoint is unpaginated on
          purpose, so this list is as long as the map is busy — 28 rows on a
          working database, more later. The cap is on the box; every row stays
          in the DOM and in the tab order, and the browser scrolls a focused
          link into view. Narrowing it is what the filters above are for. -->
          <ReportsList
            v-if="visiblePins.length"
            :pins="visiblePins"
            class="mt-4 max-h-80 overflow-y-auto"
          />
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

          <SearchBar v-model="q" @submit="mapStore.fetchPins()" placeholder="Cerca per titolo..." />

          <div class="space-y-3">
            <select
              v-model="categoryFilter"
              class="w-full rounded-lg bg-gray-100 p-4"
              aria-label="Filtra per categoria"
              @change="mapStore.fetchPins()"
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
              @change="mapStore.fetchPins()"
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
  </div>
</template>
