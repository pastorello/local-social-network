<script setup lang="ts">
import { ref, watch } from 'vue'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
// Default import on purpose: leaflet ships CJS and leaflet.markercluster
// mutates its exports object at runtime — a namespace import can be
// snapshotted by the bundler before the plugin runs and lose
// markerClusterGroup in production builds.
import L from 'leaflet'
import type {
  CircleMarker,
  LeafletMouseEvent,
  Map as LeafletMap,
  MarkerClusterGroup,
} from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

import type { ReportPin } from '@/definitions/interfaces/Report'
import { STATUS_META } from '@/lib/reportStatus'

const props = defineProps<{
  pins: ReportPin[]
  placing?: boolean
}>()

const emit = defineEmits<{
  (e: 'pinClick', id: string): void
  (e: 'mapClick', coords: { lat: number; lng: number }): void
}>()

// Gaeta (spec F2.1: configured city center)
const zoom = ref(14)
const center = ref<[number, number]>([41.2172608, 13.5625165])

let map: LeafletMap | null = null
let cluster: MarkerClusterGroup | null = null
let draftMarker: CircleMarker | null = null

const renderPins = () => {
  if (!map) return

  if (cluster) {
    cluster.remove()
  }
  cluster = L.markerClusterGroup()

  for (const pin of props.pins) {
    const marker = L.circleMarker([pin.lat, pin.lng], {
      radius: 9,
      color: '#ffffff',
      weight: 2,
      fillColor: STATUS_META[pin.status].color,
      fillOpacity: 0.9,
    })
    marker.bindTooltip(pin.title)
    marker.on('click', () => emit('pinClick', pin.id))
    cluster.addLayer(marker)
  }

  map.addLayer(cluster)
}

const onReady = (leafletMap: LeafletMap) => {
  map = leafletMap

  map.on('click', (event: LeafletMouseEvent) => {
    if (!props.placing || !map) return

    const { lat, lng } = event.latlng
    if (draftMarker) {
      draftMarker.remove()
    }
    draftMarker = L.circleMarker([lat, lng], {
      radius: 11,
      color: '#7c3aed',
      weight: 3,
      fillColor: '#a78bfa',
      fillOpacity: 0.7,
    }).addTo(map)

    emit('mapClick', { lat, lng })
  })

  renderPins()
}

watch(() => props.pins, renderPins, { deep: true })

watch(
  () => props.placing,
  (placing) => {
    if (!placing && draftMarker) {
      draftMarker.remove()
      draftMarker = null
    }
  },
)
</script>

<template>
  <div class="h-full w-full" :class="{ 'cursor-crosshair': placing }">
    <l-map v-model:zoom="zoom" :center="center" :use-global-leaflet="false" @ready="onReady">
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      ></l-tile-layer>
    </l-map>
  </div>
</template>
