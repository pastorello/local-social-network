<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import IntentTile from '@/components/content/IntentTile.vue'
import WhereAreYouField from '@/components/forms/WhereAreYouField.vue'
import ItinerarioIcon from '@/components/icons/ItinerarioIcon.vue'
import LuogoIcon from '@/components/icons/LuogoIcon.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import AnswerCard from '@/components/wizard/AnswerCard.vue'
import WizardChoices from '@/components/wizard/WizardChoices.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { useWizardArchive } from '@/composables/useWizardArchive'
import { PRESENTATION } from '@/definitions/copy'
import { zonesWithPlaces } from '@/lib/doors'
import {
  afterIntent,
  asksWhere,
  contentLine,
  intentAnswers,
  intentRows,
  intentTours,
  resultOf,
  windowAnswers,
  zoneAnswers,
} from '@/lib/wizard'

// The wizard «Cosa fare adesso», its first two steps (review of 2026-10-22,
// study 10; PR-21): «Che cosa ti va di fare?», then «Dove?», one question a
// screen, on the address a B&B's card prints (spec itinerari.md I6) — step 2
// is the same page with `?intento=`. Choosing an answer is following a link,
// so Back is the step before and a shared link opens the same step; the third
// step is «Cosa si può fare qui» opened on the answers (/cosa-fare?intento=
// &zona=). The rules — what answers, what is skipped — are lib/wizard.ts.

const route = useRoute()
const router = useRouter()
const { archive, zones, aliases, windows, known, load } = useWizardArchive()

onMounted(load)

// The answer is read from this page's own address only: other pages speak
// `?intento=` too (a list of tours), and the page being left must not answer
// for the next one.
const ownRoute = route.name
const asked = computed(() =>
  route.name === ownRoute && typeof route.query.intento === 'string' ? route.query.intento : '',
)
const intents = computed(() => intentAnswers(archive.value))
const chosen = computed(() => intents.value.find((intent) => intent.slug === asked.value) ?? null)

// The step the address names. Trusted until the answers come, as «Cosa si può
// fare qui» trusts `?zona=` (TD-53): a step 2 opened from a link says «Dove?»
// from its first frame rather than asking the first question and taking it
// back.
const step = computed(() => {
  if (!known.value) return asked.value ? 2 : 1
  return chosen.value ? 2 : 1
})

// A step 2 with one answer is skipped (lib/wizard.ts::afterIntent) — the
// answers of step 1 already link past it, and an address opened directly is
// sent on the same way; an intent with nothing behind it any more asks the
// first question again. Replaced, not pushed, so Back goes to the step before.
watch(
  [known, asked],
  () => {
    if (!known.value || !asked.value) return
    if (!chosen.value) router.replace({ query: {} })
    else if (!asksWhere(archive.value, asked.value, zones.value))
      router.replace(afterIntent(archive.value, asked.value, zones.value))
  },
  { immediate: true },
)

usePageTitle(() => (step.value === 2 && chosen.value ? ['Dove?', chosen.value.name] : null))

// Focus goes to the question at every step (ADR-0005): its one h1. A step
// reached from another page gets it from the panel, which looks for
// `data-panel-focus` (RoutePanel.vue); within this page, only the query
// changed, and this hands it over.
const title = ref<InstanceType<typeof MainTitle> | null>(null)
watch(step, async () => {
  await nextTick()
  ;(title.value?.$el as HTMLElement | undefined)?.focus({ preventScroll: true })
})

const windowsOn = computed(() => windowAnswers(windows.value))
const withPlaces = computed(() => zonesWithPlaces(zones.value))
const where = computed(() =>
  chosen.value ? zoneAnswers(archive.value, chosen.value.slug, zones.value) : [],
)
const everywhere = computed(() =>
  chosen.value
    ? contentLine(
        intentRows(archive.value.features, chosen.value.slug).length,
        intentTours(archive.value.tours, chosen.value.slug).length,
      )
    : '',
)

const chooseZone = (zone: string) => {
  if (chosen.value) router.push(resultOf(chosen.value.slug, zone))
}

const tile = 'flex size-14 flex-none items-center justify-center rounded-xl *:size-8'
</script>

<template>
  <div>
    <template v-if="step === 1">
      <p class="text-xs font-semibold tracking-[0.12em] text-terracotta uppercase">
        Benvenuti a Gaeta
      </p>
      <MainTitle ref="title" tabindex="-1" data-panel-focus class="focus:outline-none">
        Che cosa ti va di fare?
      </MainTitle>
      <p class="mt-2 max-w-[55ch] text-reading text-ink">{{ PRESENTATION }}</p>

      <!-- The answers land together once every count is in, under what is
      already on screen: none of them arrives above another. -->
      <template v-if="known">
        <ul v-if="intents.length" class="mt-6 grid gap-3 sm:grid-cols-2">
          <li v-for="intent in intents" :key="intent.slug">
            <AnswerCard
              :to="afterIntent(archive, intent.slug, zones)"
              :title="intent.name"
              :description="intent.description"
              :line="intent.line"
            >
              <template #tile>
                <IntentTile :slug="intent.slug" :class="tile" />
              </template>
            </AnswerCard>
          </li>
        </ul>
        <p v-else class="mt-6 text-muted">
          Le proposte sono in preparazione. Intanto, la mappa racconta la città.
        </p>

        <!-- «Oggi» and «Questa settimana» (cosa-fare.md Part −1, D9): kept
        apart from the everyday, and each only when something falls in it. -->
        <template v-if="windowsOn.length">
          <h2 class="mt-8 text-xs font-semibold tracking-[0.12em] text-muted uppercase">
            In calendario
          </h2>
          <ul class="mt-3 grid gap-3 sm:grid-cols-2">
            <li v-for="window in windowsOn" :key="window.key">
              <AnswerCard
                :to="{ name: 'eventilist', query: { finestra: window.key } }"
                :title="window.name"
                :description="window.description"
                :line="window.line"
              >
                <template #tile>
                  <IntentTile slug="quando" :class="tile" />
                </template>
              </AnswerCard>
            </li>
          </ul>
        </template>

        <ul class="mt-6 grid gap-3 sm:grid-cols-2">
          <li v-if="withPlaces.length">
            <AnswerCard
              :to="{ name: 'cosafare' }"
              title="Oppure guarda cosa c'è in una zona"
              description="Serapo, il centro medievale, Monte Orlando…"
            >
              <template #tile>
                <span :class="[tile, 'bg-sea/10 text-sea']" aria-hidden="true"><LuogoIcon /></span>
              </template>
            </AnswerCard>
          </li>
          <li>
            <AnswerCard to="/" title="Non lo so: fammi vedere la mappa">
              <template #tile>
                <span :class="[tile, 'bg-sea/10 text-sea']" aria-hidden="true"
                  ><ItinerarioIcon
                /></span>
              </template>
            </AnswerCard>
          </li>
        </ul>
      </template>
    </template>

    <template v-else>
      <WizardChoices :intent="chosen?.name ?? null" :intent-to="{ query: {} }" />
      <MainTitle ref="title" tabindex="-1" data-panel-focus class="mt-1 focus:outline-none">
        Dove?
      </MainTitle>

      <!-- «Dove sei?» (review PR-20): the guest who does not know the zones'
      names knows where they stand. Any place it knows leads on — the third
      step says so when that zone has nothing of what was chosen. -->
      <WhereAreYouField :aliases="aliases" :zones="zones" :current="null" @choose="chooseZone" />

      <ul v-if="known && chosen" class="mt-6 grid gap-3 sm:grid-cols-2">
        <li v-for="zone in where" :key="zone.slug">
          <AnswerCard :to="resultOf(chosen.slug, zone.slug)" :title="zone.name" :line="zone.line">
            <template #tile>
              <span :class="[tile, 'bg-sea/10 text-sea']" aria-hidden="true"><LuogoIcon /></span>
            </template>
          </AnswerCard>
        </li>
        <li>
          <AnswerCard :to="resultOf(chosen.slug)" title="Ovunque a Gaeta" :line="everywhere">
            <template #tile>
              <span :class="[tile, 'bg-sea/10 text-sea']" aria-hidden="true"
                ><ItinerarioIcon
              /></span>
            </template>
          </AnswerCard>
        </li>
      </ul>
    </template>
  </div>
</template>
