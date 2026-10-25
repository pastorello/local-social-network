<script setup lang="ts">
import { computed } from 'vue'

import UserAvatar from '@/components/cards/UserAvatar.vue'
import RichText from '@/components/content/RichText.vue'
import LanguageSwitch from '@/components/content/LanguageSwitch.vue'
import ShareButton from '@/components/content/ShareButton.vue'
import { useIsDesktop } from '@/composables/useBreakpoint'
import { intlLocale } from '@/lib/i18n'
import card from '@/lib/i18n/messages/card'
import type { CardImage, TranslationRef } from '@/definitions/interfaces/Content'
import type User from '@/definitions/interfaces/User'

// The reading surface (spec/design.md D6). Both detail views wear it —
// feste has its own view for its route editor and recurrence, but a feast
// and a church are the same *article* to a reader, and restyling that twice
// is how the two drift apart. Same reasoning as C3's generic type views.
const props = defineProps<{
  // The card group's name — the original's title, in Italian. It is the same
  // string for an original and for its translations, on purpose (2026-09-09):
  // the signs in Gaeta are in Italian, and a fully translated title is how a
  // tourist fails to find the place they are reading about.
  title: string
  // The card's own title when it differs — i.e. the translated name, shown
  // under the Italian one. Absent on an original.
  subtitle?: string | null
  // The language this card's prose is in, marked on the prose for WCAG 3.1.2
  // (Language of Parts). On the prose, not on the article (review PR-19a):
  // the headings, the byline and the way back around it are the interface's,
  // in the reader's language, which `<html lang>` already says.
  language?: string
  bodyHtml: string
  author: User
  createdAt: string
  isPublished: boolean
  images: CardImage[]
  translations: TranslationRef[]
  detailRouteName: string
  backTo: { name: string; label: string }
}>()

// D5: the first image is the cover. The rest stay a gallery below the text,
// so the article opens on a picture instead of on a wall of words.
const cover = computed(() => props.images[0] ?? null)

// On a phone a card with a place opens under a strip of the map (design.md
// D18); the cover moves below the title there, so the strip and the cover do
// not stack and push the title to mid-screen. D5's rule — the first image is
// the cover — is unchanged; only its position moves.
const { isDesktop } = useIsDesktop()
const gallery = computed(() => props.images.slice(1))

// The day it was written, in Gaeta (an instant, so read in Europe/Rome) and
// in the reader's language.
const createdAtFormatted = computed(() =>
  new Date(props.createdAt).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  }),
)
</script>

<template>
  <article class="mx-auto w-full max-w-3xl">
    <!-- Full-bleed on a phone, contained above it: the cover is the first
    thing a reader who arrived from a pin sees. -->
    <!-- The wrapper carries the bleed, not the image: a negative margin plus
    `calc(100% + 2rem)` on the <img> itself overflows to one side once the
    article is centred. -->
    <div v-if="cover && isDesktop" class="-mx-4 mb-6 sm:mx-0">
      <img
        :src="cover.imageURL"
        :alt="cover.caption || title"
        lang="it"
        class="aspect-[3/2] w-full object-cover sm:rounded-lg lg:aspect-[21/9]"
      />
    </div>

    <header class="mb-8">
      <!-- No eyebrow of its own: what kind of card this is, and where, is the
      panel's eyebrow above it (review PR-23) — the type's name as the way to
      its list, the zone as the way to «Cosa fare». A draft still says so. -->
      <div
        v-if="!isPublished || translations.length"
        class="mb-3 flex flex-wrap items-center justify-between gap-3"
      >
        <p v-if="!isPublished" class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          {{ card().draft }}
        </p>
        <LanguageSwitch :translations="translations" :detail-route-name="detailRouteName" />
      </div>

      <h1
        class="font-display text-display text-balance text-ink"
        :class="subtitle ? 'mb-1' : 'mb-4'"
        lang="it"
      >
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="mb-4 font-display text-title text-balance text-muted"
        :lang="language"
      >
        {{ subtitle }}
      </p>

      <!-- «Condividi» beside who wrote it (review PR-16): on the first screen,
      where a reader in front of the place is, rather than after the whole
      article. Not on a draft, which opens for nobody it could be sent to. -->
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p class="flex items-center gap-2 text-sm text-muted">
          <!-- No display class: UserAvatar centres its initials with flex, and
          the `inline-block` this used to pass replaced it, leaving the
          initials in the circle's top-left corner (reported 2026-10-23). -->
          <UserAvatar
            :src="author.avatarURL"
            :name="author.name"
            class="h-7 w-7 shrink-0 rounded-full object-cover text-xs"
          />
          <span
            ><strong class="font-semibold text-ink">{{ author.name }}</strong> ·
            {{ createdAtFormatted }}</span
          >
        </p>
        <ShareButton v-if="isPublished" />
      </div>
    </header>

    <div v-if="cover && !isDesktop" class="-mx-4 mb-8">
      <img
        :src="cover.imageURL"
        :alt="cover.caption || title"
        lang="it"
        class="aspect-[3/2] w-full object-cover"
      />
    </div>

    <!-- Under the title and the cover, before the text: what a reader standing
    in town needs first — a place's «Dove» (review PR-24). -->
    <slot name="lead"></slot>

    <!-- The measure is the point: reading text kept near 65 characters is
    half of what makes a sans read as an article rather than an interface. -->
    <RichText
      :html="bodyHtml"
      :lang="language"
      class="prose prose-stone mb-10 max-w-[65ch] text-reading text-ink prose-headings:font-display prose-headings:text-ink prose-a:text-sea"
    />

    <slot name="fields"></slot>

    <section v-if="gallery.length" class="mb-10">
      <h2 class="mb-3 font-display text-title text-ink">{{ card().images }}</h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <img
          v-for="image in gallery"
          :key="image.id"
          :src="image.imageURL"
          :alt="image.caption || title"
          lang="it"
          class="aspect-square w-full rounded-lg object-cover"
        />
      </div>
    </section>

    <slot name="map"></slot>

    <footer class="mt-10 border-t border-hairline pt-6">
      <slot name="actions"></slot>
      <RouterLink :to="{ name: backTo.name }" class="mt-4 inline-block text-sm text-sea underline">
        {{ card().backTo(backTo.label) }}
      </RouterLink>
    </footer>
  </article>
</template>
