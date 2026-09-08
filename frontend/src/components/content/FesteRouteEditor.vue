<script setup lang="ts">
import { ref, watch } from 'vue'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
import L from 'leaflet'
import type { LayerGroup, LeafletMouseEvent, Map as LeafletMap, Polyline } from 'leaflet'

import { useLeafletMap } from '@/composables/useLeafletMap'
import { moveItem } from '@/lib/reorder'
import { readToken } from '@/lib/tokens'
import type { RoutePoint } from '@/definitions/interfaces/Feste'

const props = defineProps<{
  modelValue: RoutePoint[]
  readonly?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', points: RoutePoint[]): void }>()

const { wrapper, zoom, center, onReady, getMap } = useLeafletMap()

let markersLayer: LayerGroup | null = null
let polyline: Polyline | null = null

const render = () => {
  const map = getMap()
  if (!map) return

  markersLayer?.remove()
  polyline?.remove()

  markersLayer = L.layerGroup()
  props.modelValue.forEach((point, index) => {
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: 8,
      color: readToken('--color-surface', '#ffffff'),
      weight: 2,
      fillColor: readToken('--color-sea', '#0f5f73'),
      fillOpacity: 0.9,
    })
    marker.bindTooltip(point.label ? `${index + 1}. ${point.label}` : `${index + 1}`)
    markersLayer?.addLayer(marker)
  })
  markersLayer.addTo(map)

  if (props.modelValue.length > 1) {
    polyline = L.polyline(
      props.modelValue.map((p) => [p.lat, p.lng]),
      { color: readToken('--color-sea', '#0f5f73'), weight: 4 },
    ).addTo(map)
  }
}

const handleReady = (map: LeafletMap) => {
  onReady(map)
  if (!props.readonly) {
    map.on('click', (event: LeafletMouseEvent) => {
      emit('update:modelValue', [
        ...props.modelValue,
        { lat: event.latlng.lat, lng: event.latlng.lng, label: '' },
      ])
    })
  }
  render()
}

watch(() => props.modelValue, render, { deep: true })

const removeStop = (index: number) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}

// The stops are the procession's order, not a set: consecutive points are what
// the polyline joins, so a stop entered out of sequence draws the route going
// the wrong way. Until 2026-09-08 the only remedy was removing every stop after
// it and adding them again — the same defect the images row had, on the one
// list where the order *is* the data rather than an editorial choice.
const moveStop = (index: number, delta: number) => {
  emit('update:modelValue', moveItem(props.modelValue, index, delta))
}

const clearRoute = () => {
  emit('update:modelValue', [])
}

const updateLabel = (index: number, label: string) => {
  const next = [...props.modelValue]
  const point = next[index]
  if (!point) return
  next[index] = { ...point, label }
  emit('update:modelValue', next)
}

// Clicking the map is the fast path, but it has no keyboard equivalent — this
// is the one for anyone who can't (or doesn't want to) use a pointer (WCAG 2.1.1).
const manualLat = ref('')
const manualLng = ref('')
const manualLabel = ref('')

const addManualStop = () => {
  const lat = Number(manualLat.value)
  const lng = Number(manualLng.value)
  if (!manualLat.value || !manualLng.value || Number.isNaN(lat) || Number.isNaN(lng)) return

  emit('update:modelValue', [...props.modelValue, { lat, lng, label: manualLabel.value }])
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
      :class="{ 'cursor-crosshair': !readonly }"
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
        Clicca sulla mappa per aggiungere una tappa.
      </p>
      <ol class="space-y-2">
        <li v-for="(point, index) in modelValue" :key="index" class="flex items-center gap-2">
          <span class="font-semibold">{{ index + 1 }}.</span>
          <template v-if="readonly">
            <span>{{ point.label || 'Tappa senza nome' }}</span>
          </template>
          <template v-else>
            <input
              type="text"
              class="flex-1 p-2 border border-gray-200 rounded"
              placeholder="Nome tappa (facoltativo)"
              :aria-label="`Nome della tappa ${index + 1}`"
              :value="point.label"
              @input="updateLabel(index, ($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="cursor-pointer px-1 text-sea disabled:cursor-default disabled:text-muted"
              :disabled="index === 0"
              :aria-label="`Sposta la tappa ${index + 1} prima della ${index}`"
              @click="moveStop(index, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="cursor-pointer px-1 text-sea disabled:cursor-default disabled:text-muted"
              :disabled="index === modelValue.length - 1"
              :aria-label="`Sposta la tappa ${index + 1} dopo la ${index + 2}`"
              @click="moveStop(index, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              class="text-red-500 cursor-pointer"
              :aria-label="`Rimuovi tappa ${index + 1}`"
              @click="removeStop(index)"
            >
              ✕
            </button>
          </template>
        </li>
      </ol>
      <button
        v-if="!readonly && modelValue.length > 0"
        type="button"
        class="text-sm text-red-500 underline cursor-pointer"
        @click="clearRoute"
      >
        Svuota percorso
      </button>

      <fieldset v-if="!readonly" class="border border-gray-200 rounded-lg p-3 space-y-2">
        <legend class="text-sm font-semibold px-1">Aggiungi tappa manualmente</legend>
        <p class="text-xs text-gray-500">In alternativa al clic sulla mappa (es. da tastiera).</p>
        <div class="flex gap-2">
          <label class="sr-only" for="feste-route-manual-lat">Latitudine</label>
          <input
            id="feste-route-manual-lat"
            v-model="manualLat"
            type="text"
            inputmode="decimal"
            placeholder="Latitudine"
            class="w-1/2 p-2 border border-gray-200 rounded text-sm"
          />
          <label class="sr-only" for="feste-route-manual-lng">Longitudine</label>
          <input
            id="feste-route-manual-lng"
            v-model="manualLng"
            type="text"
            inputmode="decimal"
            placeholder="Longitudine"
            class="w-1/2 p-2 border border-gray-200 rounded text-sm"
          />
        </div>
        <label class="sr-only" for="feste-route-manual-label">Nome tappa</label>
        <input
          id="feste-route-manual-label"
          v-model="manualLabel"
          type="text"
          placeholder="Nome tappa (facoltativo)"
          class="w-full p-2 border border-gray-200 rounded text-sm"
        />
        <button
          type="button"
          class="text-sm bg-sea text-white rounded px-3 py-2 cursor-pointer"
          @click="addManualStop"
        >
          Aggiungi tappa
        </button>
      </fieldset>
    </div>
  </div>
</template>
