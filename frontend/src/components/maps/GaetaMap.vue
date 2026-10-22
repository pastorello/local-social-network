<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
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

import type { MapCardFeature, Overlay } from '@/definitions/interfaces/MapData'
import type { MapEditor, MapFocus } from '@/stores/map'
import type { ReportPin } from '@/definitions/interfaces/Report'
import { GAETA_BOUNDS, frameInFreeSpace, type Coords } from '@/lib/mapFrame'
import { layerColor } from '@/lib/mapLayers'
import { mapText } from '@/lib/mapText'
import { stopsByPlace } from '@/lib/tours'
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/osm'
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
  // A page about a set rather than one place (cosa-fare.md D5): what it wants
  // in view, framed inside `focusPadding` like a focus but drawn as it is.
  frame?: { lat: number; lng: number }[] | null
  // A form drawing on the map (D19): its draft, drawn as the form holds it.
  editor?: MapEditor | null
}>()

const emit = defineEmits<{
  (e: 'pinClick', id: string): void
  (e: 'featureClick', feature: { type: string; id: string }): void
  (e: 'mapClick', coords: { lat: number; lng: number }): void
}>()

// Overlays belong between the base tiles (200) and everything clickable
// (overlayPane 400, markerPane 600): a historical raster is scenery, a
// quartiere polygon is context, and neither may swallow a pin's click.
const RASTER_PANE = 'overlayRasterPane'
const VECTOR_PANE = 'overlayVectorPane'

const wrapper = ref<HTMLDivElement | null>(null)
const container = ref<HTMLDivElement | null>(null)
let map: LeafletMap | null = null
let cluster: MarkerClusterGroup | null = null
let featureLayer: LayerGroup | null = null
let focusLayer: LayerGroup | null = null
let editorLayer: LayerGroup | null = null
// Where the reader was before a page took the map somewhere, so closing the
// page gives it back (D16) — their own view, or Gaeta if they had not moved
// the map yet (`own`).
let viewBeforeFocus: { center: LatLng; zoom: number; own: boolean } | null = null
// Whether the reader has taken the map: until they do, the map frames Gaeta in
// whatever space is free (review PR-5) — on a phone, above the home's sheet at
// whichever stop it rests on.
let moved = false
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
    marker.bindTooltip(mapText(pin.title))
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

  const surface = readToken('--color-surface', '#ffffff')
  for (const feature of props.features ?? []) {
    if (dimmed && feature.id === props.focus?.id) continue
    const color = layerColor(feature.type)
    const open = () => emit('featureClick', { type: feature.type, id: feature.id })
    // A draft (spec map.md M5) is hollow and dashed — told apart by its shape,
    // not only by a paler colour — and says so in its tooltip.
    const draft = !feature.is_published
    const title = draft ? `${feature.title} (bozza)` : feature.title

    for (const point of feature.points) {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        color: draft ? color : surface,
        weight: draft ? 2.5 : 2,
        dashArray: draft ? '3 3' : undefined,
        opacity: dimmed ? 0.4 : 1,
        fillColor: draft ? surface : color,
        fillOpacity,
      })
      marker.bindTooltip(mapText(point.label ? `${title} — ${point.label}` : title))
      marker.on('click', open)
      featureLayer.addLayer(marker)
    }

    // A processional route is the line plus its stops: the line carries the
    // card, each vertex carries the stop's own name (spec content.md).
    if (feature.route.length > 1) {
      const polyline = L.polyline(
        feature.route.map((point) => [point.lat, point.lng] as [number, number]),
        { color, weight: 4, opacity: lineOpacity, dashArray: draft ? '8 8' : undefined },
      )
      polyline.bindTooltip(mapText(title))
      polyline.on('click', open)
      featureLayer.addLayer(polyline)
    }
    for (const point of feature.route) {
      const stop = L.circleMarker([point.lat, point.lng], {
        radius: 5,
        color: draft ? color : surface,
        weight: 2,
        opacity: dimmed ? 0.4 : 1,
        fillColor: draft ? surface : color,
        fillOpacity: dimmed ? 0.3 : 1,
      })
      stop.bindTooltip(mapText(point.label ? `${title} — ${point.label}` : title))
      stop.on('click', open)
      featureLayer.addLayer(stop)
    }
  }

  featureLayer.addTo(map)
}

const focusPoints = (): Coords[] =>
  props.focus ? [...props.focus.route, ...props.focus.points] : []

const hasFocusGeometry = () => focusPoints().length > 0

// What a page wants in view: its own place, or the set it lists.
const framedPoints = (): Coords[] => (hasFocusGeometry() ? focusPoints() : (props.frame ?? []))

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
      }).bindTooltip(mapText(point.label || '')),
    )
  }
  // A tour's stops carry their number on the map, as in its list — and stops
  // on one spot share a marker carrying all of theirs (review PR-7).
  const places = props.focus.numbered
    ? stopsByPlace(props.focus.points)
    : props.focus.points.map((point) => ({ point, numbers: [] }))
  for (const { point, numbers } of places) {
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: 11,
      color: surface,
      weight: 3,
      fillColor: color,
      fillOpacity: 1,
    })
    if (numbers.length) {
      marker.bindTooltip(mapText(numbers.join(' · ')), { permanent: true, direction: 'top' })
    }
    focusLayer.addLayer(marker)
  }
  focusLayer.addTo(map)
}

// Every frame goes through lib/mapFrame.ts: inside the part of the map the
// page leaves free, never closer than zoom 16. Nothing moves when there is no
// room to frame anything in.
const fit = (points: Coords[], options: { animate?: boolean } = {}) => {
  const frame = map && frameInFreeSpace(points, props.focusPadding, map.getSize())
  if (frame) map?.fitBounds(frame.bounds, { ...frame.options, ...options })
}

// Frame the open page's place — or, for a page about a set, that set — and
// give the reader their view back when the page closes (D16). With no page
// asking for anything, the map frames Gaeta for as long as the reader has not
// taken it, so the city follows the free space as it changes: a panel opening
// or closing, the phone's sheet moving to another stop (review PR-5, M-01).
const frameView = (options: { animate?: boolean } = {}) => {
  if (!map) return
  const points = framedPoints()
  if (points.length) {
    if (!viewBeforeFocus) {
      viewBeforeFocus = { center: map.getCenter(), zoom: map.getZoom(), own: moved }
    }
    fit(points, options)
    return
  }
  if (viewBeforeFocus?.own) map.setView(viewBeforeFocus.center, viewBeforeFocus.zoom)
  else if (!moved && !props.editor) fit(GAETA_BOUNDS, options)
  viewBeforeFocus = null
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
      }).bindTooltip(mapText(name), { permanent: numbered, direction: 'top' }),
    )
  })
  editorLayer.addTo(map)
}

// When a form starts drawing, the map goes to what it already has, if
// anything; while it draws, the view is the collaborator's to move.
const frameEditor = () => {
  if (props.editor) fit(props.editor.points)
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
    // A point in an overlay is a circle like every other pin on this map —
    // Leaflet's default would be its marker image, which this app no longer
    // ships (TD-52: vue-leaflet was what pointed Leaflet at it).
    pointToLayer: (_point, latlng) => L.circleMarker(latlng, { radius: 6 }),
    onEachFeature: (geoFeature, layer) => {
      const name = (geoFeature.properties as Record<string, unknown> | null)?.name
      layer.bindTooltip(
        mapText(typeof name === 'string' ? `${overlay.name} — ${name}` : overlay.name),
      )
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

  // The reader takes the map by putting a hand on it — a drag, a pinch, a tap,
  // the wheel, an arrow or a zoom key — while it shows their own view. What
  // they do on a page's frame is undone when the page closes (D16), so it does
  // not count.
  const take = () => {
    if (!framedPoints().length) moved = true
  }
  const element = leafletMap.getContainer()
  element.addEventListener('pointerdown', take)
  element.addEventListener('wheel', take, { passive: true })
  element.addEventListener('keydown', (event) => {
    if (event.key.startsWith('Arrow') || ['+', '-', '='].includes(event.key)) take()
  })

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
  // The first frame is not animated: it is where the map starts.
  frameView({ animate: false })
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
    frameView()
  },
  { deep: true },
)
watch(
  () => props.frame,
  () => frameView(),
  { deep: true },
)
watch(
  () => props.focusPadding,
  () => frameView(),
  { deep: true },
)
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

// Leaflet itself, not a wrapper (TD-52): vue-leaflet drew only this map and
// its tiles, and it held the map back until three marker images it fetched
// on its own had arrived — a round trip before any tile, for markers this map
// never draws (every pin here is a circle).
//
// The map starts on Gaeta (spec F2.1) through the same function as every other
// frame, first with a plain margin — Leaflet needs a view before it can measure
// anything — then, in onReady, inside the space the page leaves free. Both
// before the tiles are added, so the only tiles fetched are the ones shown.
// The map's own maximum is the tile layer's (Leaflet's default, 18), written
// out because the cluster layer asks for it before the tiles are there.
onMounted(() => {
  if (!container.value) return
  const start = frameInFreeSpace(GAETA_BOUNDS)!
  const leafletMap = L.map(container.value, { maxZoom: 18 }).fitBounds(start.bounds, start.options)
  onReady(leafletMap)
  L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION }).addTo(leafletMap)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
})
</script>

<template>
  <div ref="wrapper" class="h-full w-full" :class="{ 'cursor-crosshair': placing || editor }">
    <div ref="container" class="h-full w-full"></div>
  </div>
</template>
