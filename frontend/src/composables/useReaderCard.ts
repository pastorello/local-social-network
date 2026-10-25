import { computed, ref, watch, type Ref } from 'vue'

import { locale } from '@/lib/i18n'
import { englishOf, fetchEnglishOf, type Translatable } from '@/lib/readerCard'

// The card a detail page shows, in the reader's language (review PR-19b,
// spec translations.md T10): `card` is the one its address names, and for a
// reader in English the original's published English version is shown in its
// place, at the same address. A version brought with the route
// (lib/cardFirst.ts) is shown at once; otherwise a reader in English waits for
// it rather than seeing the Italian and having it swapped under their eyes —
// except when they switch language on a page already open, where the card
// they were reading stays until its other version has come.
//
// `untranslated` is the English reader of a card nobody has translated yet:
// the page shows its Italian, and says so («Not yet translated into English —
// the Italian text follows»), with the text marked as Italian (WCAG 3.1.2).
export function useReaderCard<T extends Translatable>(
  card: Ref<T | null>,
  endpoint: () => string,
  brought: T | null = null,
) {
  const english = ref(brought) as Ref<T | null>
  // The card whose language has been settled once; until then a reader in
  // English is shown nothing rather than the wrong language.
  const settled = ref<string | null>(brought?.translation_of ?? null)
  const wanted = computed(() => (locale.value === 'en' ? englishOf(card.value) : null))

  watch(
    () => [card.value?.id, wanted.value?.id] as const,
    async ([id, englishId]) => {
      if (!id || !card.value) return
      if (englishId && english.value?.id !== englishId) {
        const fetched = await fetchEnglishOf(endpoint(), card.value)
        // The reader has moved on — another card, or back to Italian.
        if (card.value?.id !== id || wanted.value?.id !== englishId) return
        english.value = fetched
      }
      settled.value = id
    },
    { immediate: true },
  )

  const shown = computed<T | null>(() => {
    const original = card.value
    if (!original) return null
    const englishId = wanted.value?.id
    if (!englishId) return original
    if (english.value?.id === englishId) return english.value
    return settled.value === original.id ? original : null
  })

  const untranslated = computed(
    () =>
      locale.value === 'en' &&
      !!shown.value &&
      shown.value.language !== 'en' &&
      !shown.value.translation_of &&
      !wanted.value,
  )

  // A card saved or brought by the page: the one its address names, or the
  // English version shown in its place.
  const replace = (updated: T) => {
    if (card.value && updated.id === card.value.id) card.value = updated
    else english.value = updated
  }

  return { card: shown, untranslated, replace }
}
