<script setup lang="ts">
import { useRouter } from 'vue-router'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import TypeForm from '@/components/content/TypeForm.vue'
import type { TypeConfig } from '@/definitions/typeConfigs'
import type { ContentItem } from '@/definitions/interfaces/Content'

const props = defineProps<{ config: TypeConfig }>()

const router = useRouter()

const onCreated = (item: ContentItem) => {
  router.push({ name: props.config.routeNames.detail, params: { id: item.id } })
}
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="col-span-2 col-start-2 self-start">
      <PanelBox>
        <MainTitle>Nuova scheda — {{ config.singularLabel }}</MainTitle>
        <p class="mb-6 text-gray-500">Puoi salvarla come bozza e pubblicarla quando è pronta.</p>
        <TypeForm
          :config="config"
          @saved="onCreated"
          @cancel="router.push({ name: config.routeNames.list })"
        />
      </PanelBox>
    </div>
  </ViewContainer>
</template>
