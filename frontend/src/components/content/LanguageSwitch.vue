<script setup lang="ts">
import card from '@/lib/i18n/messages/card'
import type { TranslationRef } from '@/definitions/interfaces/Content'

// A card's other languages, named in the reader's (review PR-19a); the
// collaborator's TranslateControl keeps lib/languages.ts's Italian names.
const languageName = (code: string) => (card().languages as Record<string, string>)[code] ?? code

defineProps<{
  translations: TranslationRef[]
  detailRouteName: string
}>()
</script>

<template>
  <nav
    v-if="translations.length > 0"
    :aria-label="card().otherLanguages"
    class="flex flex-wrap gap-3 text-sm mb-4"
  >
    <RouterLink
      v-for="translation in translations"
      :key="translation.id"
      :to="{ name: detailRouteName, params: { id: translation.id } }"
      class="underline"
    >
      {{ languageName(translation.language) }}
    </RouterLink>
  </nav>
</template>
