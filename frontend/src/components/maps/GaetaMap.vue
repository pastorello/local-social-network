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
  LatLng,
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
import type { MapEditor, MapFocus } from '@/stores/map'
import type { ReportPin } from '@/definitions/interfaces/Report'
import { layerColor } from '@/lib/mapLayers'
import { keepMarkersOutOfTabOrder } from '@/lib/leafletKeyboard'
import { readToken } from '@/lib/tokens'
import { statusColor } from '@/lib/reportStatus'

// The one map of Gaeta (spec map.md): the v1 reports layer, every card type
// that has a footprint, and the overlays — "the same Gaeta, shown
// differently". Since the layout of 2026-09-18 (design.md D13) it is the ground
// of every page, mounted once by the shell. It still only draws what it is
// handed: which layers are on, and what a page wants it to look at, are the
// caller's business (stores/map.ts).
const props = defineProps<{
  pins: ReportPin[]
  features?: MapCardFeature[]
  overlays?: Overlay[]
  placing?: boolean
  // What an open page is about (D16): drawn over everything else, with the
  // rest dimmed, and framed inside `focusPadding` — the part of the map the
  // page's panel leaves visible.
  focus?: MapFocus | null
  focusPadding?: { topLeft: [number, number]; bottomRight: [number, number] }
  // A form drawing on the map (D19): its draft, drawn as the form holds it.
  editor?: MapEditor | null
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
let focusLayer: LayerGroup | null = null
let editorLayer: LayerGroup | null = null
// Where the reader was before a page took the map somewhere, so closing the
// page gives it back (D16).
let viewBeforeFocus: { center: LatLng; zoom: number } | null = null
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

  // While a page is open the rest of the city steps back (D16) — still there,
  // still clickable, but not competing with what the reader is reading about.
  // Picking stops is done on the cards' own pins, so they stay at full
  // strength then; any other drawing dims them.
  const dimmed = hasFocusGeometry() || (!!props.editor && props.editor.kind !== 'stops')
  const fillOpacity = dimmed ? 0.3 : 0.9
  const lineOpacity = dimmed ? 0.3 : 0.85

  for (const feature of props.features ?? []) {
    if (dimmed && feature.id === props.focus?.id) continue
    const color = layerColor(feature.type)
    const open = () => emit('featureClick', { type: feature.type, id: feature.id })

    for (const point of feature.points) {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        color: readToken('--color-surface', '#ffffff'),
        weight: 2,
        opacity: dimmed ? 0.4 : 1,
        fillColor: color,
        fillOpacity,
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
        { color, weight: 4, opacity: lineOpacity },
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
        opacity: dimmed ? 0.4 : 1,
        fillColor: color,
        fillOpacity: dimmed ? 0.3 : 1,
      })
      stop.bindTooltip(point.label ? `${feature.title} — ${point.label}` : feature.title)
      stop.on('click', open)
      featureLayer.addLayer(stop)
    }
  }

  featureLayer.addTo(map)
}

const focusLatLngs = (): [number, number][] =>
  props.focus
    ? [...props.focus.route, ...props.focus.points].map(
        (point) => [point.lat, point.lng] as [number, number],
      )
    : []

const hasFocusGeometry = () => focusLatLngs().length > 0

// The open page's own geometry, drawn from what the page handed over rather
// than looked up among the published features — so a draft, which is not
// among them, is shown the same way.
const renderFocus = () => {
  if (!map) return
  focusLayer?.remove()
  focusLayer = null
  if (!props.focus || !hasFocusGeometry()) return

  const color = props.focus.color ?? layerColor(props.focus.type)
  const surface = readToken('--color-surface', '#ffffff')
  focusLayer = L.layerGroup()

  if (props.focus.route.length > 1) {
    const line = props.focus.route.map((point) => [point.lat, point.lng] as [number, number])
    // A pale halo under the line keeps it readable over any tile.
    focusLayer.addLayer(L.polyline(line, { color: surface, weight: 11, opacity: 0.9 }))
    focusLayer.addLayer(L.polyline(line, { color, weight: 6, opacity: 1 }))
  }
  for (const point of props.focus.route) {
    focusLayer.addLayer(
      L.circleMarker([point.lat, point.lng], {
        radius: 7,
        color: surface,
        weight: 2.5,
        fillColor: color,
        fillOpacity: 1,
      }).bindTooltip(point.label || ''),
    )
  }
  props.focus.points.forEach((point, index) => {
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: 11,
      color: surface,
      weight: 3,
      fillColor: color,
      fillOpacity: 1,
    })
    // A tour's stops carry their number on the map, as in its list.
    if (props.focus?.numbered) {
      marker.bindTooltip(String(index + 1), { permanent: true, direction: 'top' })
    }
    focusLayer?.addLayer(marker)
  })
  focusLayer.addTo(map)
}

// Frame the open page's place in the part of the map its panel leaves free,
// and give the reader their own view back when the page closes (D16).
const frameFocus = () => {
  if (!map) return
  const latLngs = focusLatLngs()
  if (latLngs.length === 0) {
    if (viewBeforeFocus) {
      map.setView(viewBeforeFocus.center, viewBeforeFocus.zoom)
      viewBeforeFocus = null
    }
    return
  }
  if (!viewBeforeFocus) viewBeforeFocus = { center: map.getCenter(), zoom: map.getZoom() }
  map.fitBounds(L.latLngBounds(latLngs), {
    paddingTopLeft: props.focusPadding?.topLeft ?? [48, 48],
    paddingBottomRight: props.focusPadding?.bottomRight ?? [48, 48],
    maxZoom: 17,
  })
}

// The draft of the form that is drawing (D19), in the accent colour: a route's
// stops numbered and joined in order, a card's pins as pins. It is the form's
// data, drawn — the map owns none of it.
const renderEditor = () => {
  if (!map) return
  editorLayer?.remove()
  editorLayer = null
  if (!props.editor) return

  const accent = readToken('--color-sea', '#0f5f73')
  const surface = readToken('--color-surface', '#ffffff')
  editorLayer = L.layerGroup()
  const points = props.editor.points

  const joined = props.editor.kind === 'route' || !!props.editor.joined
  const numbered = props.editor.kind !== 'pins'
  if (joined && points.length > 1) {
    const line = points.map((point) => [point.lat, point.lng] as [number, number])
    editorLayer.addLayer(L.polyline(line, { color: surface, weight: 10, opacity: 0.9 }))
    editorLayer.addLayer(L.polyline(line, { color: accent, weight: 5 }))
  }
  points.forEach((point, index) => {
    const name = numbered
      ? `${index + 1}${point.label ? `. ${point.label}` : ''}`
      : point.label || `Punto ${index + 1}`
    editorLayer?.addLayer(
      L.circleMarker([point.lat, point.lng], {
        radius: numbered ? 8 : 11,
        color: surface,
        weight: 3,
        fillColor: accent,
        fillOpacity: 1,
        // A stop is drawn over its card's own pin: it must not swallow the
        // click that would pick that card again.
        interactive: props.editor?.kind !== 'stops',
      }).bindTooltip(name, { permanent: numbered, direction: 'top' }),
    )
  })
  editorLayer.addTo(map)
}

// When a form starts drawing, the map goes to what it already has, if
// anything; while it draws, the view is the collaborator's to move.
const frameEditor = () => {
  if (!map || !props.editor || props.editor.points.length === 0) return
  map.fitBounds(
    L.latLngBounds(props.editor.points.map((point) => [point.lat, point.lng] as [number, number])),
    {
      paddingTopLeft: props.focusPadding?.topLeft ?? [48, 48],
      paddingBottomRight: props.focusPadding?.bottomRight ?? [48, 48],
      maxZoom: 17,
    },
  )
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

  keepMarkersOutOfTabOrder()
  // The container stays focusable — that is what arrow-key panning needs — but
  // an unnamed focusable box announces its own text content, which here is the
  // cluster counts and the zoom buttons: "2 3 4 5 6 + −". A name instead.
  leafletMap
    .getContainer()
    .setAttribute('aria-label', 'Mappa di Gaeta. Usa le frecce per spostarti, + e − per lo zoom.')

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
    if (!map) return
    // A form drawing on the map takes the click (D19); it draws the result
    // itself, through the editor prop.
    if (props.editor) {
      emit('mapClick', { lat: event.latlng.lat, lng: event.latlng.lng })
      return
    }
    if (!props.placing) return

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
  renderFocus()
  frameFocus()
  renderEditor()
  frameEditor()
}

watch(() => props.pins, renderPins, { deep: true })
watch(() => props.features, renderFeatures, { deep: true })
watch(
  () => props.focus,
  () => {
    renderFeatures()
    renderFocus()
    frameFocus()
  },
  { deep: true },
)
watch(() => props.focusPadding, frameFocus, { deep: true })
watch(
  () => props.editor,
  (editor, previous) => {
    renderEditor()
    // Dim the rest while drawing, and frame what the form already has — once,
    // when drawing starts, not on every point added.
    if (!!editor !== !!previous || editor?.kind !== previous?.kind) {
      renderFeatures()
      frameEditor()
    }
  },
  { deep: true },
)
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
  <div ref="wrapper" class="h-full w-full" :class="{ 'cursor-crosshair': placing || editor }">
    <l-map v-model:zoom="zoom" :center="center" :use-global-leaflet="true" @ready="onReady">
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      ></l-tile-layer>
    </l-map>
  </div>
</template>
