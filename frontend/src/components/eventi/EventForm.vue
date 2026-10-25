<script setup lang="ts">
import axios from 'axios'
import { computed, onBeforeUnmount, ref } from 'vue'

import ActionButton from '@/components/buttons/ActionButton.vue'
import FormErrors from '@/components/forms/FormErrors.vue'
import FormField from '@/components/forms/FormField.vue'
import FormInput from '@/components/forms/FormInput.vue'
import MapPointsField from '@/components/forms/MapPointsField.vue'
import type { MapPoint } from '@/definitions/interfaces/Content'
import type { EventState, Evento } from '@/definitions/interfaces/Evento'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'
import { CARD_LAYERS, VENUE_TYPES } from '@/lib/mapLayers'
import { shrinkPoster } from '@/lib/posterImage'
import { formatEventWhen } from '@/lib/when'
import { useMapStore } from '@/stores/map'
import { useToastStore } from '@/stores/toast'

// An event, filed from a phone (spec cosa-fare.md Part −1 D9): a collaborator
// who meets a poster in a bar photographs it and files the event on the spot,
// without retyping the programme the poster already prints. So one column, the
// poster first, and nothing that needs a laptop. Not a card's form (CF25): no
// rich text, no gallery, no translation, no tabs.
const props = defineProps<{
  // When set, the form edits an existing event instead of filing one.
  evento?: Evento | null
}>()

const emit = defineEmits<{
  (e: 'saved', evento: Evento): void
  (e: 'cancel'): void
}>()

const mapStore = useMapStore()
const toastStore = useToastStore()

const title = ref(props.evento?.title ?? '')
const startDate = ref(props.evento?.start_date ?? '')
const startTime = ref(props.evento?.start_time ?? '')
const lasts = ref(!!props.evento && props.evento.end_date !== props.evento.start_date)
const endDate = ref(lasts.value ? (props.evento?.end_date ?? '') : '')
const description = ref(props.evento?.description ?? '')
const sourceLink = ref(props.evento?.link ?? '')
const isPublished = ref(props.evento?.is_published ?? true)
const state = ref<EventState>(props.evento?.state ?? 'in_programma')

// The poster: the one the event has, a new one picked here, or none.
const posterFile = ref<File | null>(null)
const posterPreview = ref<string | null>(props.evento?.poster ?? null)
const removePoster = ref(false)
let objectUrl: string | null = null

const onPosterPicked = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const picked = input.files?.[0]
  if (!picked) return
  posterFile.value = await shrinkPoster(picked)
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = URL.createObjectURL(posterFile.value)
  posterPreview.value = objectUrl
  removePoster.value = false
}

const dropPoster = () => {
  posterFile.value = null
  posterPreview.value = null
  removePoster.value = !!props.evento?.poster
}

onBeforeUnmount(() => {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})

// Where (D9, CF31): a card of the archive that has a place first, one labelled
// point second — a label met for the third time is the signal to write the
// place's card.
const placeMode = ref<'card' | 'point'>(
  props.evento?.place && !props.evento.place.card ? 'point' : 'card',
)
const venueId = ref(props.evento?.place?.card?.id ?? '')
const pointLabel = ref(props.evento?.place?.card ? '' : (props.evento?.place?.label ?? ''))
const point = ref<MapPoint[]>(
  props.evento?.place && !props.evento.place.card
    ? [{ lat: props.evento.place.lat, lng: props.evento.place.lng, label: '' }]
    : [],
)

// The places on the map this collaborator may name — the published ones and
// their own drafts (map.md M5) — grouped by type, alphabetical.
const venueGroups = computed(() =>
  VENUE_TYPES.map((type) => ({
    type,
    label: CARD_LAYERS.find((layer) => layer.key === type)?.label ?? type,
    venues: mapStore.features
      .filter((feature) => feature.type === type && feature.points.length > 0)
      .sort((a, b) => a.title.localeCompare(b.title, 'it')),
  })).filter((group) => group.venues.length > 0),
)
// The event's own venue, should the map not hold it (a draft of somebody
// else's, an admin editing).
const missingVenue = computed(() => {
  const card = props.evento?.place?.card
  if (!card || mapStore.features.some((feature) => feature.id === card.id)) return null
  return card
})

// CF28: the way a state may change, in the backend's own order.
const STATES: { value: EventState; label: string; hint: string }[] = [
  { value: 'in_programma', label: 'In programma', hint: 'Si tiene nel giorno scritto qui.' },
  {
    value: 'rinviato',
    label: 'Rinviato',
    hint: 'Non si tiene in quel giorno. Quando c’è la nuova data, scrivila e rimettilo in programma.',
  },
  {
    value: 'annullato',
    label: 'Annullato',
    hint: 'Resta in elenco, barrato, fino al suo giorno. Non si torna indietro: se si rifà, è un evento nuovo.',
  },
]
const allowedStates = computed(() => {
  const from = props.evento?.state
  if (from === 'annullato') return STATES.filter((option) => option.value === 'annullato')
  return STATES
})

// CF34: before saving, the date said back in words, weekday and year
// included — the guard against a mistyped day is that a human reads it.
const saidBack = computed(() => {
  if (!startDate.value) return ''
  return formatEventWhen(
    {
      start_date: startDate.value,
      start_time: startTime.value || null,
      end_date: lasts.value && endDate.value ? endDate.value : null,
    },
    { year: true },
  )
})

const formErrors = ref<string[]>([])
const fieldErrors = ref<Record<string, string[]>>({})
const submitting = ref(false)

const placePayload = () =>
  placeMode.value === 'card'
    ? { card: venueId.value || null }
    : {
        lat: point.value[0]?.lat ?? null,
        lng: point.value[0]?.lng ?? null,
        label: pointLabel.value,
      }

const checkLocally = (): Record<string, string[]> => {
  const errors: Record<string, string[]> = {}
  if (!title.value.trim()) errors.title = ['Il titolo è obbligatorio.']
  if (!startDate.value) errors.start_date = ['Scegli il giorno.']
  if (lasts.value && !endDate.value)
    errors.end_date = ['Scegli l’ultimo giorno, o togli la spunta.']
  if (placeMode.value === 'card' && !venueId.value) errors.place = ['Scegli il posto.']
  if (placeMode.value === 'point') {
    if (!pointLabel.value.trim()) errors.place = ['Scrivi il nome del posto.']
    else if (!point.value.length) errors.place = ['Metti il punto sulla mappa.']
  }
  return errors
}

const submitForm = async () => {
  formErrors.value = []
  fieldErrors.value = checkLocally()
  if (Object.keys(fieldErrors.value).length) return

  const formData = new FormData()
  formData.append('title', title.value.trim())
  formData.append('start_date', startDate.value)
  formData.append('start_time', startTime.value)
  formData.append('end_date', lasts.value ? endDate.value : '')
  formData.append('description', description.value)
  formData.append('link', sourceLink.value.trim())
  formData.append('is_published', String(isPublished.value))
  formData.append('place', JSON.stringify(placePayload()))
  if (props.evento) formData.append('state', state.value)
  if (posterFile.value) formData.append('poster', posterFile.value)
  else if (removePoster.value) formData.append('remove_poster', 'true')

  submitting.value = true
  try {
    const config = { headers: { 'Content-Type': 'multipart/form-data' } }
    const response = props.evento
      ? await axios.patch<Evento>(`/api/eventi/${props.evento.id}/`, formData, config)
      : await axios.post<Evento>('/api/eventi/', formData, config)
    toastStore.showToast(5000, props.evento ? 'Evento aggiornato!' : 'Evento salvato!')
    emit('saved', response.data)
  } catch (error) {
    formErrors.value = extractFormErrors(error)
    fieldErrors.value = extractFieldErrors(error)
  } finally {
    submitting.value = false
  }
}

const field =
  'w-full rounded-lg border bg-surface px-4 py-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
const choice =
  'flex cursor-pointer items-start gap-3 rounded-lg border border-hairline bg-surface p-4 has-[:checked]:border-sea'
</script>

<template>
  <form class="space-y-8" novalidate @submit.prevent="submitForm">
    <div class="space-y-3">
      <FormField
        field-id="evento-poster"
        label="Fotografa o scegli la locandina"
        hint="Facoltativa. Se c’è, il programma lo dice lei: non serve ricopiarlo. JPG, PNG o WebP."
        :errors="fieldErrors.poster"
      >
        <template #default="{ describedBy }">
          <input
            id="evento-poster"
            type="file"
            accept="image/*"
            :aria-describedby="describedBy"
            class="w-full rounded-lg border border-field bg-surface px-4 py-3 text-sm text-ink file:mr-4 file:rounded file:border-0 file:bg-sea file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            @change="onPosterPicked"
          />
        </template>
      </FormField>
      <div v-if="posterPreview" class="flex items-end gap-4">
        <img
          :src="posterPreview"
          alt="La locandina scelta"
          class="max-h-48 w-auto rounded-lg border border-hairline object-contain"
        />
        <button
          type="button"
          class="min-h-11 cursor-pointer text-sm text-status-open underline"
          @click="dropPoster"
        >
          Togli la locandina
        </button>
      </div>
    </div>

    <FormField field-id="evento-title" label="Titolo" :errors="fieldErrors.title">
      <template #default="{ describedBy, invalid }">
        <FormInput
          id="evento-title"
          v-model="title"
          :invalid="invalid"
          :aria-describedby="describedBy"
          placeholder="Es. Musica dal vivo sul molo"
        />
      </template>
    </FormField>

    <fieldset class="space-y-4">
      <legend class="mb-2 font-semibold text-ink">Quando</legend>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          field-id="evento-start-date"
          label="Il giorno"
          hint="Il giorno in cui comincia."
          :errors="fieldErrors.start_date"
        >
          <template #default="{ describedBy, invalid }">
            <FormInput
              id="evento-start-date"
              v-model="startDate"
              type="date"
              :invalid="invalid"
              :aria-describedby="describedBy"
            />
          </template>
        </FormField>
        <FormField
          field-id="evento-start-time"
          label="L’ora (facoltativa)"
          :errors="fieldErrors.start_time"
        >
          <template #default="{ describedBy, invalid }">
            <FormInput
              id="evento-start-time"
              v-model="startTime"
              type="time"
              :invalid="invalid"
              :aria-describedby="describedBy"
            />
          </template>
        </FormField>
      </div>

      <label class="flex min-h-11 cursor-pointer items-center gap-3 text-ink">
        <input v-model="lasts" type="checkbox" class="h-4 w-4" />
        Dura più di un giorno
      </label>
      <FormField
        v-if="lasts"
        field-id="evento-end-date"
        label="Fino al"
        hint="L’ultimo giorno, al massimo 60 giorni dopo il primo."
        :errors="fieldErrors.end_date"
      >
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="evento-end-date"
            v-model="endDate"
            type="date"
            :invalid="invalid"
            :aria-describedby="describedBy"
          />
        </template>
      </FormField>
      <p v-else-if="fieldErrors.end_date" class="text-sm font-medium text-status-open" role="alert">
        {{ fieldErrors.end_date.join(' ') }}
      </p>

      <p class="rounded-lg bg-surface px-4 py-3 text-ink" aria-live="polite">
        <template v-if="saidBack">
          Controlla: <strong>{{ saidBack }}</strong>
        </template>
        <span v-else class="text-muted">Scegli il giorno: te lo ripetiamo a parole.</span>
      </p>
    </fieldset>

    <fieldset
      class="space-y-4"
      :aria-describedby="fieldErrors.place ? 'evento-place-error' : undefined"
    >
      <legend class="mb-2 font-semibold text-ink">Dove</legend>
      <label :class="choice">
        <input
          v-model="placeMode"
          type="radio"
          name="evento-place-mode"
          value="card"
          class="mt-1 h-4 w-4"
        />
        <span>
          Un posto dell’archivio
          <span class="block text-sm text-muted">Un luogo, una chiesa, un’attività.</span>
        </span>
      </label>
      <div v-if="placeMode === 'card'" class="pl-1">
        <label for="evento-venue" class="sr-only">Il posto dell’archivio</label>
        <select
          id="evento-venue"
          v-model="venueId"
          :aria-invalid="fieldErrors.place ? true : undefined"
          :aria-describedby="fieldErrors.place ? 'evento-place-error' : undefined"
          :class="[field, fieldErrors.place ? 'border-status-open' : 'border-field']"
        >
          <option value="" disabled>Scegli il posto</option>
          <option v-if="missingVenue" :value="missingVenue.id">{{ missingVenue.title }}</option>
          <optgroup v-for="group in venueGroups" :key="group.type" :label="group.label">
            <option v-for="venue in group.venues" :key="venue.id" :value="venue.id">
              {{ venue.title }}{{ venue.is_published ? '' : ' (bozza)' }}
            </option>
          </optgroup>
        </select>
      </div>

      <label :class="choice">
        <input
          v-model="placeMode"
          type="radio"
          name="evento-place-mode"
          value="point"
          class="mt-1 h-4 w-4"
        />
        <span>
          Un altro posto
          <span class="block text-sm text-muted">Una piazza, un molo: un nome e un punto.</span>
        </span>
      </label>
      <div v-if="placeMode === 'point'" class="space-y-4 pl-1">
        <div class="flex flex-col gap-2">
          <label for="evento-place-label" class="font-semibold text-ink">Il nome del posto</label>
          <input
            id="evento-place-label"
            v-model="pointLabel"
            type="text"
            maxlength="140"
            placeholder="Es. Piazza XIX Maggio"
            :aria-invalid="fieldErrors.place ? true : undefined"
            :aria-describedby="fieldErrors.place ? 'evento-place-error' : undefined"
            :class="[field, fieldErrors.place ? 'border-status-open' : 'border-field']"
          />
        </div>
        <MapPointsField
          v-model="point"
          kind="pins"
          :max="1"
          unlabelled
          :drawing="placeMode === 'point'"
          id-prefix="evento-point"
        />
      </div>
      <p
        v-if="fieldErrors.place"
        id="evento-place-error"
        class="text-sm font-medium text-status-open"
        role="alert"
      >
        {{ fieldErrors.place.join(' ') }}
      </p>
    </fieldset>

    <FormField
      field-id="evento-description"
      label="Una riga (facoltativa)"
      hint="Quello che la locandina non dice: dove si entra, cosa portare."
      :errors="fieldErrors.description"
    >
      <template #default="{ describedBy, invalid }">
        <textarea
          id="evento-description"
          v-model="description"
          rows="2"
          maxlength="300"
          :aria-describedby="describedBy"
          :aria-invalid="invalid || undefined"
          :class="[field, invalid ? 'border-status-open' : 'border-field']"
        ></textarea>
      </template>
    </FormField>

    <FormField
      field-id="evento-link"
      label="Programma e conferme (facoltativo)"
      hint="La pagina di chi organizza, dove si conferma o si annulla. Mai un sito che vende biglietti."
      :errors="fieldErrors.link"
    >
      <template #default="{ describedBy, invalid }">
        <FormInput
          id="evento-link"
          v-model="sourceLink"
          type="url"
          :invalid="invalid"
          :aria-describedby="describedBy"
        />
      </template>
    </FormField>

    <fieldset v-if="evento" class="space-y-3">
      <legend class="mb-2 font-semibold text-ink">Si tiene?</legend>
      <label v-for="option in allowedStates" :key="option.value" :class="choice">
        <input
          v-model="state"
          type="radio"
          name="evento-state"
          :value="option.value"
          class="mt-1 h-4 w-4"
        />
        <span>
          {{ option.label }}
          <span class="block text-sm text-muted">{{ option.hint }}</span>
        </span>
      </label>
      <p v-if="fieldErrors.state" class="text-sm font-medium text-status-open" role="alert">
        {{ fieldErrors.state.join(' ') }}
      </p>
    </fieldset>

    <div class="space-y-2">
      <div class="flex items-start gap-3 rounded-lg border border-hairline bg-surface p-4">
        <input id="evento-published" v-model="isPublished" type="checkbox" class="mt-1 h-4 w-4" />
        <label for="evento-published" class="text-ink">
          Pubblica subito
          <span class="block text-sm text-muted">
            Un evento in bozza è visibile solo a te e agli amministratori.
          </span>
        </label>
      </div>
      <p v-if="fieldErrors.is_published" class="text-sm font-medium text-status-open" role="alert">
        {{ fieldErrors.is_published.join(' ') }}
      </p>
    </div>

    <FormErrors :errors="formErrors" />

    <div class="flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
      <ActionButton type="submit" :disabled="submitting">
        {{ evento ? 'Salva le modifiche' : 'Salva l’evento' }}
      </ActionButton>
      <button
        type="button"
        class="cursor-pointer rounded-lg px-6 py-4 text-ink underline"
        @click="emit('cancel')"
      >
        Annulla
      </button>
    </div>
  </form>
</template>
