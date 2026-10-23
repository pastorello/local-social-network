<script setup lang="ts">
import axios from 'axios'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import ActionButton from '@/components/buttons/ActionButton.vue'
import { useToastStore } from '@/stores/toast'
import { LANGUAGE_LABELS, TRANSLATABLE_LANGUAGES } from '@/lib/languages'
import type { TranslationRef } from '@/definitions/interfaces/Content'

// T2 (spec translations.md): "traduci questo articolo in…" — opens an empty
// target-language version alongside the source. Not shown for a card that is
// itself a translation (start_translation forbids chaining) — the parent
// view is responsible for that check via v-if.
const props = defineProps<{
  translateEndpoint: string
  translations: TranslationRef[]
  detailRouteName: string
}>()

const router = useRouter()
const toastStore = useToastStore()
const submitting = ref(false)

const missingLanguages = computed(() =>
  TRANSLATABLE_LANGUAGES.filter((code) => !props.translations.some((t) => t.language === code)),
)

const existingTranslations = computed(() =>
  props.translations.filter((t) => TRANSLATABLE_LANGUAGES.includes(t.language)),
)

const startTranslation = async (language: string) => {
  submitting.value = true
  try {
    const response = await axios.post(props.translateEndpoint, { language })
    router.push({
      name: props.detailRouteName,
      params: { id: response.data.id },
      query: { edit: '1' },
    })
  } catch {
    toastStore.showToast(5000, 'Impossibile avviare la traduzione.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    v-if="missingLanguages.length > 0 || existingTranslations.length > 0"
    class="flex flex-wrap items-center gap-2"
  >
    <ActionButton
      v-for="code in missingLanguages"
      :key="code"
      size="small"
      :disabled="submitting"
      @click="startTranslation(code)"
    >
      Traduci in {{ LANGUAGE_LABELS[code] }}
    </ActionButton>
    <RouterLink
      v-for="translation in existingTranslations"
      :key="translation.id"
      :to="{ name: detailRouteName, params: { id: translation.id } }"
      class="underline text-sm"
    >
      Vai alla traduzione in {{ LANGUAGE_LABELS[translation.language]
      }}{{ translation.is_published ? '' : ' (bozza)' }}
    </RouterLink>
  </div>
</template>
