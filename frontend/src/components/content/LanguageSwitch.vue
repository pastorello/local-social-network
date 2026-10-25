<script setup lang="ts">
import { computed } from 'vue'

import { isLocale } from '@/lib/i18n'
import card from '@/lib/i18n/messages/card'
import type { TranslationRef } from '@/definitions/interfaces/Content'

// A card's other languages, named in the reader's (review PR-19a); the
// collaborator's TranslateControl keeps lib/languages.ts's Italian names.
const languageName = (code: string) => (card().languages as Record<string, string>)[code] ?? code

const props = defineProps<{
  translations: TranslationRef[]
  // The original's id: the card's address in every language.
  originalId: string
  detailRouteName: string
}>()

// Since review PR-19b a card is read in the reader's language at its
// original's address (translations.md T10), so its switch is the reader's
// language switch: the same address, naming the other language — which the
// router turns into that language, interface and card alike. Only a version
// a reader can open: a published one, in a language the interface speaks. An
// author's draft is opened from its own page (TranslateControl).
const languages = computed(() =>
  props.translations.filter((version) => version.is_published && isLocale(version.language)),
)
</script>

<template>
  <nav
    v-if="languages.length > 0"
    :aria-label="card().otherLanguages"
    class="flex flex-wrap gap-3 text-sm mb-4"
  >
    <RouterLink
      v-for="version in languages"
      :key="version.id"
      :to="{
        name: detailRouteName,
        params: { id: originalId },
        query: { lang: version.language },
      }"
      class="underline"
    >
      {{ languageName(version.language) }}
    </RouterLink>
  </nav>
</template>
