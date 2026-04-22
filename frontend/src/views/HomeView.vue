<script setup lang="ts">
import CityMap from '@/components/maps/CityMap.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
</script>

<template>
  <ViewContainer class="grid-cols-6">
    <div class="col-span-2 main-left">
      <PanelBox>
        <MainTitle>Punti di interesse</MainTitle>
      </PanelBox>
    </div>

    <div class="col-span-4 main-right">
      <PanelBox>
        <CityMap></CityMap>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
