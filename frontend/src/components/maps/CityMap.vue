<template>
  <div style="height: 400px; width: 100%">
    <l-map ref="map" v-model:zoom="zoom" :center="[41.2172608, 13.5625165]">
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      ></l-tile-layer>
    </l-map>
  </div>
</template>

<script>
import 'leaflet/dist/leaflet.css'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'

export default {
  components: {
    LMap,
    LTileLayer,
  },
  data() {
    return {
      zoom: 14,
    }
  },
}
</script>

<style></style>
