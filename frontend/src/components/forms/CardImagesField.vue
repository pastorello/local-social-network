<script setup lang="ts">
import { computed } from 'vue'

import FormField from '@/components/forms/FormField.vue'
import type { CardImageEntry } from '@/lib/cardImages'
import { moveItem } from '@/lib/reorder'

// The card's images, as one ordered strip. Shared by `TypeForm` and
// `FesteForm` rather than copied into both: this block is about to be the
// third thing they render identically, and CardArticle/CardGrid are here
// because copies drift.
//
// **Order is the point.** D5 makes the first image the cover, so arranging
// them is an editorial act, not housekeeping — and it has to be possible with
// a keyboard, which rules out drag-and-drop as the only way (ADR-0005). Two
// buttons per image, each with a label that says where it goes.
const props = defineProps<{
  fieldId: string
  errors?: string[]
  // Appended to this field's hint rather than rendered beside it, so the whole
  // instruction is one string the control points at with `aria-describedby`.
  // `libri` uses it for the covers rule (spec content.md, 2026-09-09).
  hintSuffix?: string
}>()

const hint = computed(() =>
  ['La prima è la copertina della scheda. JPG, PNG o WebP, fino a 5 MB l’una.', props.hintSuffix]
    .filter(Boolean)
    .join(' '),
)

const entries = defineModel<CardImageEntry[]>('entries', { required: true })
const removedIds = defineModel<(string | number)[]>('removedIds', { required: true })

const onFilesSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  for (const file of Array.from(input.files ?? [])) {
    const reader = new FileReader()
    reader.onload = (e) =>
      entries.value.push({ kind: 'new', file, preview: e.target?.result as string })
    reader.readAsDataURL(file)
  }
  // Cleared so picking the same file again still fires `change`.
  input.value = ''
}

const remove = (index: number) => {
  const [entry] = entries.value.splice(index, 1)
  if (entry?.kind === 'existing') removedIds.value.push(entry.id)
}

const move = (index: number, delta: number) => {
  entries.value = moveItem(entries.value, index, delta)
}

const source = (entry: CardImageEntry) => (entry.kind === 'new' ? entry.preview : entry.url)
const key = (entry: CardImageEntry, index: number) =>
  entry.kind === 'new' ? `new-${index}-${entry.file.name}` : `existing-${entry.id}`
</script>

<template>
  <FormField
    :field-id="props.fieldId"
    label="Aggiungi immagini"
    :hint="hint"
    :errors="props.errors"
  >
    <template #default="{ describedBy }">
      <input
        :id="props.fieldId"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        :aria-describedby="describedBy"
        class="w-full rounded-lg border border-field bg-surface px-4 py-3 text-sm text-ink file:mr-4 file:rounded file:border-0 file:bg-sea file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        @change="onFilesSelected"
      />
    </template>
  </FormField>

  <ol v-if="entries.length" class="flex flex-wrap gap-3">
    <li v-for="(entry, index) in entries" :key="key(entry, index)" class="w-24">
      <div class="relative">
        <img :src="source(entry)" class="h-24 w-24 rounded-lg object-cover" alt="" />
        <!-- Said, not implied: the first one is the cover, and a reader meets
        it before anything else on the card. -->
        <span
          v-if="index === 0"
          class="absolute inset-x-0 bottom-0 rounded-b-lg bg-ink/80 py-0.5 text-center text-[0.65rem] font-semibold text-white"
        >
          Copertina
        </span>
        <button
          type="button"
          class="absolute -top-2 -right-2 h-6 w-6 cursor-pointer rounded-full bg-status-open text-xs text-white"
          :aria-label="`Rimuovi immagine ${index + 1}`"
          @click="remove(index)"
        >
          ✕
        </button>
      </div>

      <div class="mt-1 flex justify-between">
        <button
          type="button"
          class="cursor-pointer rounded px-2 py-1 text-xs text-sea disabled:cursor-default disabled:text-muted"
          :disabled="index === 0"
          :aria-label="
            index === 1
              ? `Sposta l’immagine ${index + 1} al primo posto: diventa la copertina`
              : `Sposta l’immagine ${index + 1} indietro`
          "
          @click="move(index, -1)"
        >
          ←
        </button>
        <button
          type="button"
          class="cursor-pointer rounded px-2 py-1 text-xs text-sea disabled:cursor-default disabled:text-muted"
          :disabled="index === entries.length - 1"
          :aria-label="
            index === 0
              ? `Sposta la copertina avanti: la copertina diventa l’immagine 2`
              : `Sposta l’immagine ${index + 1} avanti`
          "
          @click="move(index, 1)"
        >
          →
        </button>
      </div>
    </li>
  </ol>
</template>
