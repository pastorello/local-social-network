<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
import L from 'leaflet'
import type { LayerGroup, LeafletMouseEvent, Map as LeafletMap } from 'leaflet'

import { useLeafletMap } from '@/composables/useLeafletMap'
import { readToken } from '@/lib/tokens'
import type { MapPoint } from '@/definitions/interfaces/Content'

// An unordered, capped bag of points — no numbering, no connecting polyline.
// Kept separate from FesteRouteEditor.vue on purpose: the two interaction
// models (ordered route vs. capped unordered pins) diverge enough that a
// shared component would be mostly conditionals.
const props = defineProps<{
  modelValue: MapPoint[]
  max: number
  readonly?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', points: MapPoint[]): void }>()

const { wrapper, zoom, center, onReady, getMap } = useLeafletMap()

let markersLayer: LayerGroup | null = null

const atCapacity = computed(() => props.modelValue.length >= props.max)

const render = () => {
  const map = getMap()
  if (!map) return

  markersLayer?.remove()
  markersLayer = L.layerGroup()
  props.modelValue.forEach((point) => {
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: 8,
      color: readToken('--color-surface', '#ffffff'),
      weight: 2,
      fillColor: readToken('--color-sea', '#0f5f73'),
      fillOpacity: 0.9,
    })
    if (point.label) marker.bindTooltip(point.label)
    markersLayer?.addLayer(marker)
  })
  markersLayer.addTo(map)
}

const addPoint = (point: MapPoint) => {
  if (atCapacity.value) return
  emit('update:modelValue', [...props.modelValue, point])
}

const handleReady = (map: LeafletMap) => {
  onReady(map)
  if (!props.readonly) {
    map.on('click', (event: LeafletMouseEvent) => {
      addPoint({ lat: event.latlng.lat, lng: event.latlng.lng, label: '' })
    })
  }
  render()
}

watch(() => props.modelValue, render, { deep: true })

const removePoint = (index: number) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}

const updateLabel = (index: number, label: string) => {
  const next = [...props.modelValue]
  const point = next[index]
  if (!point) return
  next[index] = { ...point, label }
  emit('update:modelValue', next)
}

// Clicking the map is the fast path, but it has no keyboard equivalent — this
// is the one for anyone who can't (or doesn't want to) use a pointer (WCAG
// 2.1.1), same pattern as FesteRouteEditor.vue's manual-add fieldset.
const manualLat = ref('')
const manualLng = ref('')
const manualLabel = ref('')

const addManualPoint = () => {
  const lat = Number(manualLat.value)
  const lng = Number(manualLng.value)
  if (!manualLat.value || !manualLng.value || Number.isNaN(lat) || Number.isNaN(lng)) return

  addPoint({ lat, lng, label: manualLabel.value })
  manualLat.value = ''
  manualLng.value = ''
  manualLabel.value = ''
}
</script>

<template>
  <div class="grid grid-cols-3 gap-4">
    <div
      ref="wrapper"
      class="col-span-2 h-64 rounded-lg overflow-hidden"
      :class="{ 'cursor-crosshair': !readonly && !atCapacity }"
    >
      <l-map v-model:zoom="zoom" :center="center" :use-global-leaflet="true" @ready="handleReady">
        <l-tile-layer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          layer-type="base"
          name="OpenStreetMap"
        ></l-tile-layer>
      </l-map>
    </div>

    <div class="space-y-2">
      <p v-if="!readonly" class="text-sm text-gray-500">
        <template v-if="max === 1">
          {{
            atCapacity
              ? 'Un solo punto sulla mappa.'
              : 'Clicca sulla mappa per aggiungere il punto.'
          }}
        </template>
        <template v-else>
          {{
            atCapacity
              ? `Hai raggiunto il limite di ${max} punti.`
              : 'Clicca sulla mappa per aggiungere un punto.'
          }}
        </template>
      </p>
      <ul class="space-y-2">
        <li v-for="(point, index) in modelValue" :key="index" class="flex items-center gap-2">
          <template v-if="readonly">
            <span>{{ point.label || 'Punto senza nome' }}</span>
          </template>
          <template v-else>
            <input
              type="text"
              class="flex-1 p-2 border border-gray-200 rounded"
              :placeholder="
                max === 1
                  ? 'Nome del punto (facoltativo)'
                  : `Nome del punto ${index + 1} (facoltativo)`
              "
              :aria-label="`Nome del punto ${index + 1}`"
              :value="point.label"
              @input="updateLabel(index, ($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="text-red-500 cursor-pointer"
              :aria-label="`Rimuovi punto ${index + 1}`"
              @click="removePoint(index)"
            >
              ✕
            </button>
          </template>
        </li>
      </ul>

      <fieldset
        v-if="!readonly && !atCapacity"
        class="border border-gray-200 rounded-lg p-3 space-y-2"
      >
        <legend class="text-sm font-semibold px-1">Aggiungi un punto manualmente</legend>
        <p class="text-xs text-gray-500">In alternativa al clic sulla mappa (es. da tastiera).</p>
        <div class="flex gap-2">
          <label class="sr-only" for="map-pins-manual-lat">Latitudine</label>
          <input
            id="map-pins-manual-lat"
            v-model="manualLat"
            type="text"
            inputmode="decimal"
            placeholder="Latitudine"
            class="w-1/2 p-2 border border-gray-200 rounded text-sm"
          />
          <label class="sr-only" for="map-pins-manual-lng">Longitudine</label>
          <input
            id="map-pins-manual-lng"
            v-model="manualLng"
            type="text"
            inputmode="decimal"
            placeholder="Longitudine"
            class="w-1/2 p-2 border border-gray-200 rounded text-sm"
          />
        </div>
        <label class="sr-only" for="map-pins-manual-label">Nome del punto</label>
        <input
          id="map-pins-manual-label"
          v-model="manualLabel"
          type="text"
          placeholder="Nome del punto (facoltativo)"
          class="w-full p-2 border border-gray-200 rounded text-sm"
        />
        <button
          type="button"
          class="text-sm bg-sea text-white rounded px-3 py-2 cursor-pointer"
          @click="addManualPoint"
        >
          Aggiungi punto
        </button>
      </fieldset>
    </div>
  </div>
</template>
