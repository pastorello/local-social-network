<script setup lang="ts">
import { LANGUAGE_LABELS } from '@/lib/languages'
import type { TranslationRef } from '@/definitions/interfaces/Content'

defineProps<{
  translations: TranslationRef[]
  detailRouteName: string
}>()
</script>

<template>
  <nav
    v-if="translations.length > 0"
    aria-label="Cambia lingua"
    class="flex flex-wrap gap-3 text-sm mb-4"
  >
    <RouterLink
      v-for="translation in translations"
      :key="translation.id"
      :to="{ name: detailRouteName, params: { id: translation.id } }"
      class="underline"
    >
      {{ LANGUAGE_LABELS[translation.language] ?? translation.language }}
    </RouterLink>
  </nav>
</template>
