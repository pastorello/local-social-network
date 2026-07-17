<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
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

// vue-leaflet must build the map from THIS leaflet instance (the one
// markercluster augmented). With use-global-leaflet=false it imports a
// second, separate copy of leaflet — and layers from one instance can't be
// added to a map from the other (nothing renders, handlers never fire).
;(globalThis as typeof globalThis & { L: typeof L }).L = L

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

const wrapper = ref<HTMLDivElement | null>(null)
let map: LeafletMap | null = null
let cluster: MarkerClusterGroup | null = null
let draftMarker: CircleMarker | null = null
let resizeObserver: ResizeObserver | null = null

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

  // The grid layout may not have settled when Leaflet measures its
  // container (width 0 → degenerate bounds: no pins rendered, broken
  // click coordinates). Re-measure now and on every wrapper resize —
  // this also covers the layout shift when the filter panel toggles.
  map.invalidateSize()
  if (wrapper.value) {
    resizeObserver = new ResizeObserver(() => map?.invalidateSize())
    resizeObserver.observe(wrapper.value)
  }

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

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div ref="wrapper" class="h-full w-full" :class="{ 'cursor-crosshair': placing }">
    <l-map v-model:zoom="zoom" :center="center" :use-global-leaflet="true" @ready="onReady">
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      ></l-tile-layer>
    </l-map>
  </div>
</template>
