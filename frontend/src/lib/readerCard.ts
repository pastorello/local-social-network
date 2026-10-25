import axios from 'axios'

import type { TranslationRef } from '@/definitions/interfaces/Content'
import { locale } from '@/lib/i18n'

// A card's page in the reader's language (review PR-19b, spec translations.md
// T10). The address is the original's, which stays the canonical one: a reader
// in English reads its published English version there, found in the
// original's `translations` (the cards whose `translation_of` it is), and a
// reader in English of a card nobody has translated yet reads the Italian,
// told so. The heading is the Italian name either way (T7).

export interface Translatable {
  id: string
  language: string
  translation_of: string | null
  translations: TranslationRef[]
}

// The English version an original is read in by a reader in English: a
// published one only. An author's own draft is in `translations` too, and is
// opened from its own page (TranslateControl), never shown to a reader here.
export const englishOf = (card: Translatable | null | undefined): TranslationRef | null =>
  card && !card.translation_of && card.language !== 'en'
    ? (card.translations.find((version) => version.language === 'en' && version.is_published) ??
      null)
    : null

// The English version of `card` for a reader in English, or null — for a
// reader in Italian, for a card with none, and when it could not be fetched,
// in which case the page shows the Italian rather than nothing.
export const fetchEnglishOf = async <T extends Translatable>(
  endpoint: string,
  card: T,
): Promise<T | null> => {
  const english = locale.value === 'en' ? englishOf(card) : null
  if (!english) return null
  try {
    return (await axios.get<T>(`${endpoint}${english.id}/`)).data
  } catch {
    return null
  }
}
