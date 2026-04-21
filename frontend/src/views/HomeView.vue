<script setup lang="ts">
import CityMap from '@/components/maps/CityMap.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-6 gap-4">
    <div class="col-span-2 main-left">
      <PanelBox>
        <h1 class="text-3xl font-bold">Punti di interesse</h1>
      </PanelBox>
    </div>

    <div class="col-span-4 main-right">
      <PanelBox>
        <CityMap></CityMap>
      </PanelBox>
    </div>
  </div>
</template>
