<script setup lang="ts">
import { formatEventWhen } from '@/lib/when'

// A feast's dates, one row a year (spec cosa-fare.md Part −1 D9, K2): typed by
// hand when the committee confirms them, never computed from the recurrence.
// The form only sees what is not over yet; the past ones stay in the archive
// and nothing here removes them (CF26).
export interface EditionEntry {
  // The stored edition this row is, sent back so it keeps its row.
  id?: number
  start_date: string
  // Empty for a one-day feast.
  end_date: string
  note: string
}

const props = defineProps<{
  idPrefix: string
  // A translation shows its original's dates and cannot change them (T5).
  readonly?: boolean
  errors?: string[]
}>()

const entries = defineModel<EditionEntry[]>({ required: true })

const add = () => {
  entries.value = [...entries.value, { start_date: '', end_date: '', note: '' }]
}

const remove = (index: number) => {
  entries.value = entries.value.filter((_, i) => i !== index)
}

const update = (index: number, field: keyof EditionEntry, value: string) => {
  entries.value = entries.value.map((entry, i) =>
    i === index ? { ...entry, [field]: value } : entry,
  )
}

// Each date said back with its weekday (CF34), as an event's is.
const saidBack = (entry: EditionEntry) =>
  entry.start_date
    ? formatEventWhen(
        { start_date: entry.start_date, end_date: entry.end_date || null },
        { year: true },
      )
    : ''

const input =
  'w-full rounded-lg border border-field bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
</script>

<template>
  <fieldset
    class="space-y-4"
    :aria-describedby="
      [`${idPrefix}-hint`, errors?.length ? `${idPrefix}-error` : ''].filter(Boolean).join(' ')
    "
  >
    <legend class="font-semibold text-ink">Le prossime edizioni</legend>
    <p :id="`${idPrefix}-hint`" class="text-sm text-muted">
      <template v-if="props.readonly">
        Le date sono quelle della scheda originale. Si cambiano da lì.
      </template>
      <template v-else>
        Quando il comitato conferma la data di quest’anno, scrivila qui. Senza, la scheda dice la
        ricorrenza e «data non ancora confermata». Le edizioni passate restano in archivio.
      </template>
    </p>

    <ol v-if="entries.length" class="space-y-4">
      <li
        v-for="(entry, index) in entries"
        :key="entry.id ?? `nuova-${index}`"
        class="space-y-3 rounded-lg border border-hairline bg-surface p-4"
      >
        <p v-if="props.readonly" class="text-ink">
          {{ saidBack(entry) }}<template v-if="entry.note"> — {{ entry.note }}</template>
        </p>
        <template v-else>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label :for="`${idPrefix}-${index}-start`" class="text-sm font-semibold text-ink">
                Dal
              </label>
              <input
                :id="`${idPrefix}-${index}-start`"
                type="date"
                :value="entry.start_date"
                :class="input"
                @input="update(index, 'start_date', ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label :for="`${idPrefix}-${index}-end`" class="text-sm font-semibold text-ink">
                Al (se dura più giorni)
              </label>
              <input
                :id="`${idPrefix}-${index}-end`"
                type="date"
                :value="entry.end_date"
                :class="input"
                @input="update(index, 'end_date', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label :for="`${idPrefix}-${index}-note`" class="text-sm font-semibold text-ink">
              Nota (facoltativa)
            </label>
            <input
              :id="`${idPrefix}-${index}-note`"
              type="text"
              maxlength="200"
              :value="entry.note"
              placeholder="Es. processione a mare alle 18"
              :class="input"
              @input="update(index, 'note', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-ink" aria-live="polite">
              <template v-if="saidBack(entry)">
                Controlla: <strong>{{ saidBack(entry) }}</strong>
              </template>
            </p>
            <button
              type="button"
              class="min-h-11 cursor-pointer text-sm text-status-open underline"
              :aria-label="`Togli l’edizione ${index + 1}`"
              @click="remove(index)"
            >
              Togli
            </button>
          </div>
        </template>
      </li>
    </ol>
    <p v-else-if="props.readonly" class="text-sm text-muted">Nessuna data confermata.</p>

    <button
      v-if="!props.readonly"
      type="button"
      class="min-h-11 cursor-pointer rounded-lg border border-sea px-4 text-sm font-semibold text-sea focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      @click="add"
    >
      Aggiungi un’edizione
    </button>

    <p
      v-if="errors?.length"
      :id="`${idPrefix}-error`"
      class="text-sm font-medium text-status-open"
      role="alert"
    >
      {{ errors.join(' ') }}
    </p>
  </fieldset>
</template>
