<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useMapStore } from '@/stores/map'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import FesteForm from '@/components/content/FesteForm.vue'
import type Feste from '@/definitions/interfaces/Feste'

const router = useRouter()

const onCreated = (feste: Feste) => {
  useMapStore().fetchFeatures()
  router.push({ name: 'festedetail', params: { id: feste.id } })
}
</script>

<template>
  <ViewContainer class="grid-cols-1">
    <div class="mx-auto w-full max-w-3xl">
      <PanelBox>
        <MainTitle>Nuova festa</MainTitle>
        <p class="mb-8 text-muted">Puoi salvarla come bozza e pubblicarla quando è pronta.</p>
        <FesteForm @saved="onCreated" @cancel="router.push('/feste')" />
      </PanelBox>
    </div>
  </ViewContainer>
</template>
