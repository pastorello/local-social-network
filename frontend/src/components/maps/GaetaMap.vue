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
  GeoJSON as GeoJSONLayer,
  ImageOverlay,
  Layer,
  LayerGroup,
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

import type { MapCardFeature, Overlay } from '@/definitions/interfaces/MapData'
import type { ReportPin } from '@/definitions/interfaces/Report'
import { layerColor } from '@/lib/mapLayers'
import { readToken } from '@/lib/tokens'
import { statusColor } from '@/lib/reportStatus'

// The one map of Gaeta (spec map.md): the v1 reports layer, every card type
// that has a footprint, and the overlays — "the same Gaeta, shown
// differently". This component only draws what it is handed; which layers are
// on is the caller's business (HomeView.vue owns the toggles).
const props = defineProps<{
  pins: ReportPin[]
  features?: MapCardFeature[]
  overlays?: Overlay[]
  placing?: boolean
}>()

const emit = defineEmits<{
  (e: 'pinClick', id: string): void
  (e: 'featureClick', feature: { type: string; id: string }): void
  (e: 'mapClick', coords: { lat: number; lng: number }): void
}>()

// Gaeta (spec F2.1: configured city center)
const zoom = ref(14)
const center = ref<[number, number]>([41.2172608, 13.5625165])

// Overlays belong between the base tiles (200) and everything clickable
// (overlayPane 400, markerPane 600): a historical raster is scenery, a
// quartiere polygon is context, and neither may swallow a pin's click.
const RASTER_PANE = 'overlayRasterPane'
const VECTOR_PANE = 'overlayVectorPane'

const wrapper = ref<HTMLDivElement | null>(null)
let map: LeafletMap | null = null
let cluster: MarkerClusterGroup | null = null
let featureLayer: LayerGroup | null = null
let draftMarker: CircleMarker | null = null
let resizeObserver: ResizeObserver | null = null
const overlayLayers = new Map<string, Layer>()

const renderPins = () => {
  if (!map) return

  if (cluster) {
    cluster.remove()
  }
  cluster = L.markerClusterGroup()

  for (const pin of props.pins) {
    const marker = L.circleMarker([pin.lat, pin.lng], {
      radius: 9,
      color: readToken('--color-surface', '#ffffff'),
      weight: 2,
      fillColor: statusColor(pin.status),
      fillOpacity: 0.9,
    })
    marker.bindTooltip(pin.title)
    marker.on('click', () => emit('pinClick', pin.id))
    cluster.addLayer(marker)
  }

  map.addLayer(cluster)
}

const renderFeatures = () => {
  if (!map) return

  featureLayer?.remove()
  featureLayer = L.layerGroup()

  for (const feature of props.features ?? []) {
    const color = layerColor(feature.type)
    const open = () => emit('featureClick', { type: feature.type, id: feature.id })

    for (const point of feature.points) {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        color: readToken('--color-surface', '#ffffff'),
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      })
      marker.bindTooltip(point.label ? `${feature.title} — ${point.label}` : feature.title)
      marker.on('click', open)
      featureLayer.addLayer(marker)
    }

    // A processional route is the line plus its stops: the line carries the
    // card, each vertex carries the stop's own name (spec content.md).
    if (feature.route.length > 1) {
      const polyline = L.polyline(
        feature.route.map((point) => [point.lat, point.lng] as [number, number]),
        { color, weight: 4, opacity: 0.85 },
      )
      polyline.bindTooltip(feature.title)
      polyline.on('click', open)
      featureLayer.addLayer(polyline)
    }
    for (const point of feature.route) {
      const stop = L.circleMarker([point.lat, point.lng], {
        radius: 5,
        color: readToken('--color-surface', '#ffffff'),
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
      stop.bindTooltip(point.label ? `${feature.title} — ${point.label}` : feature.title)
      stop.on('click', open)
      featureLayer.addLayer(stop)
    }
  }

  featureLayer.addTo(map)
}

const buildOverlay = (overlay: Overlay): Layer | null => {
  if (overlay.kind === 'raster') {
    if (!overlay.imageURL || !overlay.bounds) return null
    return L.imageOverlay(overlay.imageURL, overlay.bounds, {
      opacity: overlay.opacity,
      pane: RASTER_PANE,
      alt: overlay.name,
    })
  }
  if (!overlay.geojson) return null
  return L.geoJSON(overlay.geojson as never, {
    pane: VECTOR_PANE,
    style: () => ({
      color: overlay.color,
      weight: 2,
      fillColor: overlay.color,
      fillOpacity: overlay.opacity,
    }),
    onEachFeature: (geoFeature, layer) => {
      const name = (geoFeature.properties as Record<string, unknown> | null)?.name
      layer.bindTooltip(typeof name === 'string' ? `${overlay.name} — ${name}` : overlay.name)
    },
  })
}

// Add and remove by id rather than rebuilding the group: the opacity slider
// fires continuously while it is dragged, and a rebuild per tick makes a
// raster overlay flash.
const renderOverlays = () => {
  if (!map) return

  const wanted = new Map((props.overlays ?? []).map((overlay) => [overlay.id, overlay]))

  for (const [id, layer] of overlayLayers) {
    if (!wanted.has(id)) {
      layer.remove()
      overlayLayers.delete(id)
    }
  }

  for (const [id, overlay] of wanted) {
    if (overlayLayers.has(id)) continue
    const layer = buildOverlay(overlay)
    if (!layer) continue
    layer.addTo(map)
    overlayLayers.set(id, layer)
  }
}

const applyOverlayOpacity = () => {
  for (const overlay of props.overlays ?? []) {
    const layer = overlayLayers.get(overlay.id)
    if (!layer) continue
    if (overlay.kind === 'raster') {
      ;(layer as ImageOverlay).setOpacity(overlay.opacity)
    } else {
      ;(layer as GeoJSONLayer).setStyle({ fillOpacity: overlay.opacity })
    }
  }
}

const onReady = (leafletMap: LeafletMap) => {
  map = leafletMap

  leafletMap.createPane(RASTER_PANE).style.zIndex = '350'
  leafletMap.createPane(VECTOR_PANE).style.zIndex = '380'

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
      color: readToken('--color-sea-deep', '#0a4655'),
      weight: 3,
      fillColor: readToken('--color-sea', '#0f5f73'),
      fillOpacity: 0.7,
    }).addTo(map)

    emit('mapClick', { lat, lng })
  })

  renderPins()
  renderFeatures()
  renderOverlays()
}

watch(() => props.pins, renderPins, { deep: true })
watch(() => props.features, renderFeatures, { deep: true })
watch(() => (props.overlays ?? []).map((overlay) => overlay.id).join('|'), renderOverlays)
watch(() => (props.overlays ?? []).map((overlay) => overlay.opacity), applyOverlayOpacity)

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
