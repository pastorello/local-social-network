<script setup lang="ts">
import { useRouter } from 'vue-router'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import FesteForm from '@/components/content/FesteForm.vue'
import type Feste from '@/definitions/interfaces/Feste'

const router = useRouter()

const onCreated = (feste: Feste) => {
  router.push({ name: 'festedetail', params: { id: feste.id } })
}
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="col-span-2 col-start-2 self-start">
      <PanelBox>
        <MainTitle>Nuova festa</MainTitle>
        <p class="mb-6 text-gray-500">
          Puoi salvarla come bozza e pubblicarla quando è pronta.
        </p>
        <FesteForm @saved="onCreated" @cancel="router.push('/feste')" />
      </PanelBox>
    </div>
  </ViewContainer>
</template>
