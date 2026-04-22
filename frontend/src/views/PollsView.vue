<script setup lang="ts">
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-4 gap-4">
    <div class="main-left col-span-1">
      <PanelBox class="text-center">LEFT COLUMN</PanelBox>
    </div>

    <div class="main-center col-span-2 space-y-4">
      <PanelBox> <MainTitle>Polls list</MainTitle> </PanelBox>
    </div>

    <div class="main-right col-span-1 space-y-4">
      <PanelBox class="text-center">RIGHT COLUMN</PanelBox>
    </div>
  </div>
</template>
