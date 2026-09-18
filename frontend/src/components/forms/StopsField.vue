<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { CARD_LAYERS } from '@/lib/mapLayers'
import { moveItem } from '@/lib/reorder'
import { useMapStore } from '@/stores/map'
import type { MapPoint } from '@/definitions/interfaces/Content'
import { pointOf, type StopDraft } from '@/lib/tours'

// A tour's stops, picked on the map under the panel (spec itinerari.md I8,
// design.md D19): while this field is `drawing`, a click on a card's pin makes
// that card the next stop. Every stop is a card of the archive that has a
// place (I3) — a click on empty map adds nothing. The keyboard path is the
// list of cards to choose from, by title.
const props = defineProps<{
  modelValue: StopDraft[]
  drawing: boolean
  // A percorso's stops are joined in order on the map; a raccolta's are not.
  joined: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', stops: StopDraft[]): void
  (e: 'done'): void
}>()

const mapStore = useMapStore()

const MAX_STOPS = 40

const typeLabel = (key: string | null) =>
  CARD_LAYERS.find((layer) => layer.key === key)?.label ?? 'Scheda'

// The cards a stop can be: the published ones with a place, as the map has
// them. Grouped by type for the keyboard path.
const candidates = computed(() =>
  CARD_LAYERS.map((layer) => ({
    label: layer.label,
    cards: mapStore.features
      .filter((feature) => feature.type === layer.key)
      .sort((a, b) => a.title.localeCompare(b.title, 'it')),
  })).filter((group) => group.cards.length),
)

const draftFor = (id: string): StopDraft | null => {
  const feature = mapStore.features.find((candidate) => candidate.id === id)
  if (!feature) return null
  return {
    card: feature.id,
    type: feature.type,
    title: feature.title,
    point_index: null,
    points: feature.points,
    route: feature.route,
    savedPoint: null,
    note: '',
  }
}

const add = (id: string) => {
  if (props.readonly || props.modelValue.length >= MAX_STOPS) return
  const draft = draftFor(id)
  if (draft) emit('update:modelValue', [...props.modelValue, draft])
}

const bannerLabel = computed(() =>
  props.modelValue.length >= MAX_STOPS
    ? `Hai raggiunto il limite di ${MAX_STOPS} tappe`
    : `Clicca sul pin di una scheda per aggiungerla come tappa ${props.modelValue.length + 1}`,
)

// Lend the stops to the map while this tab is open — the same bargain as
// MapPointsField: the form owns them, the map draws them and reports picks.
let lease: symbol | null = null
const sync = () => {
  if (props.drawing && !props.readonly) {
    lease = mapStore.startEditing(
      {
        kind: 'stops',
        points: props.modelValue.map(pointOf).filter((point): point is MapPoint => !!point),
        max: MAX_STOPS,
        label: bannerLabel.value,
        joined: props.joined,
      },
      () => {},
      () => emit('done'),
      (feature) => add(feature.id),
    )
  } else if (lease) {
    mapStore.stopEditing(lease)
    lease = null
  }
}
watch(
  () => [props.drawing, props.readonly, props.joined, props.modelValue, bannerLabel.value],
  sync,
  { deep: true, immediate: true },
)
onBeforeUnmount(() => {
  if (lease) mapStore.stopEditing(lease)
})

const update = (index: number, patch: Partial<StopDraft>) => {
  const next = [...props.modelValue]
  const stop = next[index]
  if (!stop) return
  next[index] = { ...stop, ...patch }
  emit('update:modelValue', next)
}
const remove = (index: number) =>
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
const move = (index: number, offset: number) =>
  emit('update:modelValue', moveItem(props.modelValue, index, offset))

const picked = ref('')
const addPicked = () => {
  if (!picked.value) return
  add(picked.value)
  picked.value = ''
}

const control =
  'rounded-lg border border-field bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
const iconButton =
  'flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full text-sea hover:bg-page disabled:cursor-default disabled:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
</script>

<template>
  <div class="space-y-5">
    <p class="text-muted">
      <template v-if="readonly">
        Le tappe sono quelle dell’itinerario originale. Si cambiano da lì.
      </template>
      <template v-else>
        Clicca sul pin di una scheda sulla mappa per aggiungerla come tappa{{
          joined ? ': le tappe si seguono nell’ordine della lista.' : '.'
        }}
      </template>
    </p>

    <component :is="joined ? 'ol' : 'ul'" v-if="modelValue.length" class="space-y-4">
      <li
        v-for="(stop, index) in modelValue"
        :key="`${stop.card}-${index}`"
        class="space-y-2 rounded-lg border border-hairline bg-surface p-3"
      >
        <div class="flex items-center gap-2">
          <span class="w-6 flex-none text-right font-semibold">{{ index + 1 }}.</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold text-ink">{{ stop.title }}</span>
            <span class="text-xs text-muted">{{ typeLabel(stop.type) }}</span>
          </span>
          <template v-if="!readonly">
            <button
              type="button"
              :class="iconButton"
              :disabled="index === 0"
              :aria-label="`Sposta la tappa ${index + 1} prima della ${index}`"
              @click="move(index, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              :class="iconButton"
              :disabled="index === modelValue.length - 1"
              :aria-label="`Sposta la tappa ${index + 1} dopo la ${index + 2}`"
              @click="move(index, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              :class="[iconButton, 'text-status-open']"
              :aria-label="`Rimuovi la tappa ${index + 1}`"
              @click="remove(index)"
            >
              ✕
            </button>
          </template>
        </div>

        <!-- "The tiella, at this bakery" (I3): which of the card's pins. -->
        <div v-if="!readonly && stop.points.length > 1" class="flex items-center gap-2 pl-8">
          <label :for="`stop-point-${index}`" class="text-sm text-muted">Dove</label>
          <select
            :id="`stop-point-${index}`"
            :class="[control, 'flex-1']"
            :value="stop.point_index ?? 0"
            @change="
              update(index, { point_index: Number(($event.target as HTMLSelectElement).value) })
            "
          >
            <option
              v-for="(point, pointIndex) in stop.points"
              :key="pointIndex"
              :value="pointIndex"
            >
              {{ point.label || `Punto ${pointIndex + 1}` }}
            </option>
          </select>
        </div>

        <div class="pl-8">
          <label :for="`stop-note-${index}`" class="sr-only"
            >Nota per la tappa {{ index + 1 }}</label
          >
          <textarea
            v-if="!readonly"
            :id="`stop-note-${index}`"
            :value="stop.note"
            rows="2"
            :class="[control, 'w-full']"
            placeholder="Perché fermarsi qui, in questo giro (facoltativo)"
            @input="update(index, { note: ($event.target as HTMLTextAreaElement).value })"
          ></textarea>
          <p v-else-if="stop.note" class="text-sm whitespace-pre-line text-ink">{{ stop.note }}</p>
        </div>
      </li>
    </component>

    <!-- The keyboard path: choosing a card by title, the map click's
    equivalent (WCAG 2.1.1). -->
    <fieldset
      v-if="!readonly && modelValue.length < MAX_STOPS"
      class="space-y-2 rounded-lg border border-hairline bg-surface p-4"
    >
      <legend class="px-1 text-sm font-semibold text-ink">Aggiungi una tappa per titolo</legend>
      <p class="text-xs text-muted">In alternativa al clic sulla mappa (es. da tastiera).</p>
      <div class="flex gap-2">
        <label for="stop-pick" class="sr-only">Scheda da aggiungere</label>
        <select id="stop-pick" v-model="picked" :class="[control, 'min-w-0 flex-1']">
          <option value="">Scegli una scheda</option>
          <optgroup v-for="group in candidates" :key="group.label" :label="group.label">
            <option v-for="card in group.cards" :key="card.id" :value="card.id">
              {{ card.title }}
            </option>
          </optgroup>
        </select>
        <button
          type="button"
          class="cursor-pointer rounded-lg bg-sea px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
          @click="addPicked"
        >
          Aggiungi tappa
        </button>
      </div>
    </fieldset>
  </div>
</template>
