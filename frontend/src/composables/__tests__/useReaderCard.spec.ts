import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { effectScope, ref, type EffectScope } from 'vue'

import { useReaderCard } from '../useReaderCard'
import { setLocale } from '@/lib/i18n'
import type { TranslationRef } from '@/definitions/interfaces/Content'

vi.mock('axios')

interface Card {
  id: string
  title: string
  language: string
  translation_of: string | null
  translations: TranslationRef[]
}

const original = (translations: TranslationRef[] = []): Card => ({
  id: 'it1',
  title: 'Santissima Annunziata',
  language: 'it',
  translation_of: null,
  translations,
})
const published: TranslationRef = {
  id: 'en1',
  language: 'en',
  title: 'Annunziata',
  is_published: true,
}
const draft: TranslationRef = { ...published, is_published: false }
const english: Card = {
  id: 'en1',
  title: 'Church of the Annunciation',
  language: 'en',
  translation_of: 'it1',
  translations: [{ id: 'it1', language: 'it', title: 'Santissima Annunziata', is_published: true }],
}

// Review PR-19b (translations.md T10): a card is read in the reader's language
// at its original's address.
describe('useReaderCard', () => {
  // Each test's watchers stop with it, as a page's do when it unmounts.
  let scope: EffectScope
  const use = (...args: Parameters<typeof useReaderCard<Card>>) =>
    scope.run(() => useReaderCard(...args))!
  beforeEach(() => {
    vi.clearAllMocks()
    scope = effectScope()
  })
  afterEach(async () => {
    scope.stop()
    await setLocale('it')
  })

  it('shows the Italian to a reader in Italian, and asks for nothing', async () => {
    const reader = use(ref(original([published])), () => '/api/chiese/')
    await flushPromises()

    expect(reader.card.value?.id).toBe('it1')
    expect(reader.untranslated.value).toBe(false)
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('shows a reader in English the published English version, at the same address', async () => {
    await setLocale('en')
    vi.mocked(axios.get).mockResolvedValue({ data: english })

    const reader = use(ref(original([published])), () => '/api/chiese/')
    // Nothing rather than the Italian first, swapped under the reader's eyes.
    expect(reader.card.value).toBeNull()
    await flushPromises()

    expect(axios.get).toHaveBeenCalledWith('/api/chiese/en1/')
    expect(reader.card.value?.id).toBe('en1')
    expect(reader.untranslated.value).toBe(false)
  })

  it('shows one brought with the route at once', async () => {
    await setLocale('en')

    const reader = use(ref(original([published])), () => '/api/chiese/', english)

    expect(reader.card.value?.id).toBe('en1')
    await flushPromises()
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('shows the Italian, and says so, where only a draft exists — whoever is reading', async () => {
    await setLocale('en')

    const reader = use(ref(original([draft])), () => '/api/chiese/')
    await flushPromises()

    expect(reader.card.value?.id).toBe('it1')
    expect(reader.untranslated.value).toBe(true)
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('keeps the card on screen while the reader switches, until its other version comes', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: english })
    const reader = use(ref(original([published])), () => '/api/chiese/')
    await flushPromises()
    expect(reader.card.value?.id).toBe('it1')

    await setLocale('en')
    expect(reader.card.value?.id).toBe('it1')
    await flushPromises()
    expect(reader.card.value?.id).toBe('en1')

    await setLocale('it')
    expect(reader.card.value?.id).toBe('it1')
  })

  it('shows the Italian, without promising a translation, when the English could not be fetched', async () => {
    await setLocale('en')
    vi.mocked(axios.get).mockRejectedValue(new Error('404'))

    const reader = use(ref(original([published])), () => '/api/chiese/')
    await flushPromises()

    expect(reader.card.value?.id).toBe('it1')
    expect(reader.untranslated.value).toBe(false)
  })

  it('shows a translation opened at its own address as it is', async () => {
    await setLocale('en')

    const reader = use(ref(english), () => '/api/chiese/')
    await flushPromises()

    expect(reader.card.value?.id).toBe('en1')
    expect(reader.untranslated.value).toBe(false)
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('puts a saved card back where it came from: the address’s, or the English shown', async () => {
    await setLocale('en')
    const card = ref<Card | null>(original([published]))
    const reader = use(card, () => '/api/chiese/', english)

    reader.replace({ ...english, title: 'Annunciation, revised' })
    expect(reader.card.value?.title).toBe('Annunciation, revised')
    expect(card.value?.title).toBe('Santissima Annunziata')

    reader.replace({ ...original([published]), title: 'Annunziata, rivista' })
    expect(card.value?.title).toBe('Annunziata, rivista')
  })
})
