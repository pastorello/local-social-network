<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { moveItem } from '@/lib/reorder'
import { useMapStore } from '@/stores/map'
import type { MapPoint } from '@/definitions/interfaces/Content'

// A card's place, edited on the map under every page (spec/design.md D19): the
// form owns the points, and while this field is `drawing` it lends them to the
// background map — which draws them and reports clicks back — instead of
// mounting a map of its own. It replaces FesteRouteEditor and MapPinsEditor,
// which were a map inside a panel over a map.
//
// Two shapes, as before: a route is ordered — consecutive stops are what the
// line joins, so they are reordered with buttons (lib/reorder.ts) — and pins
// are an unordered bag with a cap (a church has one). Typing coordinates stays:
// it is the keyboard path the map click does not have (WCAG 2.1.1).
const props = defineProps<{
  modelValue: MapPoint[]
  kind: 'route' | 'pins'
  max?: number
  // A translation shows the original's place and cannot edit it (T5).
  readonly?: boolean
  // True while the form's map tab is open: only then does the map draw.
  drawing: boolean
  idPrefix: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', points: MapPoint[]): void
  // "Fatto" on the map's banner.
  (e: 'done'): void
}>()

const mapStore = useMapStore()

const route = computed(() => props.kind === 'route')
const cap = computed(() => (route.value ? Infinity : (props.max ?? 1)))
const atCapacity = computed(() => props.modelValue.length >= cap.value)
const noun = computed(() => (route.value ? 'tappa' : 'punto'))

// What the banner over the map says: what is being drawn, and what the next
// click does.
const bannerLabel = computed(() => {
  if (route.value) {
    return `Stai disegnando il percorso · clicca sulla mappa per aggiungere la tappa ${props.modelValue.length + 1}`
  }
  if (atCapacity.value) {
    return cap.value === 1
      ? 'Il punto è sulla mappa · toglilo per sceglierne un altro'
      : `Hai raggiunto il limite di ${cap.value} punti`
  }
  return cap.value === 1
    ? 'Clicca sulla mappa nel punto del luogo'
    : 'Clicca sulla mappa per aggiungere un punto'
})

const add = (point: MapPoint) => {
  if (props.readonly || atCapacity.value) return
  emit('update:modelValue', [...props.modelValue, point])
}

const editorState = () => ({
  kind: props.kind,
  points: props.modelValue,
  max: cap.value,
  label: bannerLabel.value,
})

// Lend the points to the map while drawing, and take them back when drawing
// stops — the tab closes, the form is cancelled or saved. The lease keeps this
// field from switching off an editor some other form started.
let lease: symbol | null = null
const onAdd = (point: { lat: number; lng: number }) => add({ ...point, label: '' })
const onDone = () => emit('done')

const sync = () => {
  if (props.drawing && !props.readonly) {
    lease = mapStore.startEditing(editorState(), onAdd, onDone)
  } else if (lease) {
    mapStore.stopEditing(lease)
    lease = null
  }
}

watch(() => [props.drawing, props.readonly, props.modelValue, bannerLabel.value], sync, {
  deep: true,
  immediate: true,
})

onBeforeUnmount(() => {
  if (lease) mapStore.stopEditing(lease)
})

const updateLabel = (index: number, label: string) => {
  const next = [...props.modelValue]
  const point = next[index]
  if (!point) return
  next[index] = { ...point, label }
  emit('update:modelValue', next)
}

const remove = (index: number) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}

const move = (index: number, offset: number) => {
  emit('update:modelValue', moveItem(props.modelValue, index, offset))
}

const clear = () => emit('update:modelValue', [])

const manualLat = ref('')
const manualLng = ref('')
const manualLabel = ref('')

const addManual = () => {
  const lat = Number(manualLat.value)
  const lng = Number(manualLng.value)
  if (!manualLat.value || !manualLng.value || Number.isNaN(lat) || Number.isNaN(lng)) return
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return

  add({ lat, lng, label: manualLabel.value })
  manualLat.value = ''
  manualLng.value = ''
  manualLabel.value = ''
}

const input =
  'rounded-lg border border-field bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
const iconButton =
  'flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full text-sea hover:bg-page disabled:cursor-default disabled:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
</script>

<template>
  <div class="space-y-5">
    <p class="text-muted">
      <template v-if="readonly">
        {{
          route
            ? 'Il percorso è quello della scheda originale. Si cambia da lì.'
            : 'Il luogo è quello della scheda originale. Si sposta da lì.'
        }}
      </template>
      <template v-else-if="route">
        Clicca sulla mappa per aggiungere una tappa: le tappe si uniscono nell’ordine della lista.
      </template>
      <template v-else>
        {{
          cap === 1
            ? 'Clicca sulla mappa nel punto del luogo.'
            : `Clicca sulla mappa per aggiungere un punto (fino a ${cap}).`
        }}
      </template>
    </p>

    <component :is="route ? 'ol' : 'ul'" v-if="modelValue.length" class="space-y-2">
      <li v-for="(point, index) in modelValue" :key="index" class="flex items-center gap-2">
        <span v-if="route" class="w-6 flex-none text-right font-semibold">{{ index + 1 }}.</span>
        <span v-if="readonly" class="text-ink">
          {{ point.label || (route ? 'Tappa senza nome' : 'Punto senza nome') }}
        </span>
        <template v-else>
          <input
            type="text"
            :class="[input, 'min-w-0 flex-1']"
            :placeholder="`Nome ${route ? 'della tappa' : 'del punto'} (facoltativo)`"
            :aria-label="`Nome ${route ? 'della tappa' : 'del punto'} ${index + 1}`"
            :value="point.label"
            @input="updateLabel(index, ($event.target as HTMLInputElement).value)"
          />
          <template v-if="route">
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
          </template>
          <button
            type="button"
            :class="[iconButton, 'text-status-open']"
            :aria-label="`Rimuovi ${noun} ${index + 1}`"
            @click="remove(index)"
          >
            ✕
          </button>
        </template>
      </li>
    </component>

    <button
      v-if="route && !readonly && modelValue.length > 0"
      type="button"
      class="cursor-pointer text-sm text-status-open underline"
      @click="clear"
    >
      Svuota percorso
    </button>

    <fieldset
      v-if="!readonly && !atCapacity"
      class="space-y-2 rounded-lg border border-hairline bg-surface p-4"
    >
      <legend class="px-1 text-sm font-semibold text-ink">
        Aggiungi {{ route ? 'una tappa' : 'un punto' }} a mano
      </legend>
      <p class="text-xs text-muted">In alternativa al clic sulla mappa (es. da tastiera).</p>
      <div class="flex gap-2">
        <label class="sr-only" :for="`${idPrefix}-manual-lat`">Latitudine</label>
        <input
          :id="`${idPrefix}-manual-lat`"
          v-model="manualLat"
          type="text"
          inputmode="decimal"
          placeholder="Latitudine"
          :class="[input, 'w-1/2']"
        />
        <label class="sr-only" :for="`${idPrefix}-manual-lng`">Longitudine</label>
        <input
          :id="`${idPrefix}-manual-lng`"
          v-model="manualLng"
          type="text"
          inputmode="decimal"
          placeholder="Longitudine"
          :class="[input, 'w-1/2']"
        />
      </div>
      <label class="sr-only" :for="`${idPrefix}-manual-label`">
        Nome {{ route ? 'della tappa' : 'del punto' }}
      </label>
      <input
        :id="`${idPrefix}-manual-label`"
        v-model="manualLabel"
        type="text"
        :placeholder="`Nome ${route ? 'della tappa' : 'del punto'} (facoltativo)`"
        :class="[input, 'w-full']"
      />
      <button
        type="button"
        class="cursor-pointer rounded-lg bg-sea px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        @click="addManual"
      >
        Aggiungi {{ route ? 'tappa' : 'punto' }}
      </button>
    </fieldset>
  </div>
</template>
