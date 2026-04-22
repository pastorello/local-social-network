<script setup lang="ts">
import { ref } from 'vue'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'

const zoom = ref(13)
const center = ref([41.2172608, 13.5625165])
</script>

<template>
  <div class="h-100 w-full">
    <l-map ref="map" v-model:zoom="zoom" :center="center">
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      ></l-tile-layer>
    </l-map>
  </div>
</template>
