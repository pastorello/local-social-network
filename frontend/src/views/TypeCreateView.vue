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
  <ViewContainer class="grid-cols-1">
    <div class="mx-auto w-full max-w-3xl">
      <PanelBox>
        <MainTitle>Nuova scheda — {{ config.singularLabel }}</MainTitle>
        <p class="mb-8 text-muted">Puoi salvarla come bozza e pubblicarla quando è pronta.</p>
        <TypeForm
          :config="config"
          @saved="onCreated"
          @cancel="router.push({ name: config.routeNames.list })"
        />
      </PanelBox>
    </div>
  </ViewContainer>
</template>
