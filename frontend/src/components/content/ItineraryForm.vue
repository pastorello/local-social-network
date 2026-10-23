<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'

import ActionButton from '@/components/buttons/ActionButton.vue'
import RichTextEditor from '@/components/content/RichTextEditor.vue'
import CardImagesField from '@/components/forms/CardImagesField.vue'
import FormField from '@/components/forms/FormField.vue'
import FormInput from '@/components/forms/FormInput.vue'
import FormTabs, { type FormTab } from '@/components/forms/FormTabs.vue'
import MapPointsField from '@/components/forms/MapPointsField.vue'
import StopsField from '@/components/forms/StopsField.vue'
import type { MapPoint } from '@/definitions/interfaces/Content'
import type Itinerario from '@/definitions/interfaces/Itinerario'
import type { Genre as Intent } from '@/definitions/interfaces/Luogo'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'
import { appendImages, toEntries, type CardImageEntry } from '@/lib/cardImages'
import type { StopDraft } from '@/lib/tours'
import { useMapStore } from '@/stores/map'
import { useToastStore } from '@/stores/toast'

// A tour, written on the map (spec itinerari.md I8, design.md D19): its stops
// are picked by clicking cards' pins, its path — a percorso's walk between
// them — is drawn as a festa's route is. The fields an itinerary adds to a card
// are only its form, a duration and its intents.
const props = defineProps<{ tour?: Itinerario | null }>()
const emit = defineEmits<{
  (e: 'saved', tour: Itinerario): void
  (e: 'cancel'): void
}>()

const toastStore = useToastStore()
const mapStore = useMapStore()

const title = ref(props.tour?.title ?? '')
const bodyHtml = ref(props.tour?.body_html ?? '')
const form = ref<'raccolta' | 'percorso'>(props.tour?.form ?? 'percorso')
const duration = ref(props.tour?.duration ?? '')
const intents = ref<string[]>([...(props.tour?.intents ?? [])])
const isPublished = ref(props.tour?.is_published ?? false)
const path = ref<MapPoint[]>([...(props.tour?.route ?? [])])
const imageEntries = ref<CardImageEntry[]>(toEntries(props.tour?.images))
const removedImageIds = ref<(string | number)[]>([])

// A translation shows the original's tour (stops, path, form, intents) and
// owns none of them — the API refuses them, the form does not offer them.
const isTranslation = computed(() => props.tour?.translation_of != null)
const sharedImages = computed(() => props.tour?.images ?? [])

// The stops being edited: each with its card's own pins (from the map, which
// has every published card with a place) so "which bakery" can be chosen.
const toDraft = (stop: Itinerario['stops'][number]): StopDraft => {
  const feature = mapStore.features.find((candidate) => candidate.id === stop.card)
  return {
    card: stop.card,
    type: stop.type,
    title: stop.title,
    point_index: stop.point_index,
    points: feature?.points ?? [],
    route: feature?.route ?? [],
    savedPoint: stop.point,
    note: stop.note,
  }
}
const stops = ref<StopDraft[]>((props.tour?.stops ?? []).map(toDraft))

const intentOptions = ref<Intent[]>([])
onMounted(async () => {
  mapStore.load()
  try {
    intentOptions.value = (await axios.get<Intent[]>('/api/itinerari/intenti/')).data
  } catch {
    formErrors.value.push('Non è stato possibile caricare gli intenti.')
  }
})

const formErrors = ref<string[]>([])
const fieldErrors = ref<Record<string, string[]>>({})
const submitting = ref(false)

// The sections as tabs (D19); the path's tab exists only for a percorso (I2).
const tab = ref('contenuto')
const tabOf = (field: string): string => {
  if (['images', 'image_order', 'remove_image_ids'].includes(field)) return 'immagini'
  if (field === 'stops') return 'tappe'
  if (field === 'route') return 'tragitto'
  if (field === 'is_published') return 'pubblicazione'
  return 'contenuto'
}
const tabs = computed<FormTab[]>(() => {
  const withErrors = new Set<string>(Object.keys(fieldErrors.value).map(tabOf))
  return [
    { key: 'contenuto', label: 'Contenuto' },
    { key: 'tappe', label: 'Tappe' },
    ...(form.value === 'percorso' ? [{ key: 'tragitto', label: 'Il tragitto' }] : []),
    { key: 'immagini', label: 'Immagini' },
    { key: 'pubblicazione', label: 'Pubblicazione' },
  ].map((entry) => ({ ...entry, hasError: withErrors.has(entry.key) }))
})

const submitForm = async () => {
  formErrors.value = []
  if (!title.value.trim()) formErrors.value.push('Il titolo è obbligatorio.')
  if (!bodyHtml.value.trim()) formErrors.value.push('Il testo è obbligatorio.')
  if (formErrors.value.length > 0) {
    tab.value = 'contenuto'
    return
  }

  const formData = new FormData()
  formData.append('title', title.value.trim())
  formData.append('body_html', bodyHtml.value)
  formData.append('duration', duration.value)
  formData.append('is_published', String(isPublished.value))
  if (!isTranslation.value) {
    formData.append('form', form.value)
    formData.append('intents', JSON.stringify(intents.value))
    formData.append(
      'stops',
      JSON.stringify(
        stops.value.map((stop) => ({
          card: stop.card,
          point_index: stop.point_index,
          note: stop.note,
        })),
      ),
    )
    if (form.value === 'percorso') formData.append('route', JSON.stringify(path.value))
    appendImages(formData, imageEntries.value, removedImageIds.value)
  }

  submitting.value = true
  try {
    const config = { headers: { 'Content-Type': 'multipart/form-data' } }
    const response = props.tour
      ? await axios.patch<Itinerario>(`/api/itinerari/${props.tour.id}/`, formData, config)
      : await axios.post<Itinerario>('/api/itinerari/', formData, config)
    toastStore.showToast(5000, props.tour ? 'Itinerario aggiornato!' : 'Itinerario creato!')
    emit('saved', response.data)
  } catch (error) {
    formErrors.value = extractFormErrors(error)
    fieldErrors.value = extractFieldErrors(error)
    const firstRejected = Object.keys(fieldErrors.value)[0]
    if (firstRejected) tab.value = tabOf(firstRejected)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-8" v-on:submit.prevent="submitForm">
    <FormTabs v-model="tab" :tabs="tabs" id-prefix="tour-form" />

    <div
      v-show="tab === 'contenuto'"
      id="tour-form-panel-contenuto"
      role="tabpanel"
      aria-labelledby="tour-form-tab-contenuto"
    >
      <fieldset class="space-y-5">
        <legend class="sr-only">Contenuto</legend>

        <FormField
          field-id="tour-title"
          :label="isTranslation ? 'Nome tradotto' : 'Titolo'"
          :errors="fieldErrors.title"
        >
          <template #default="{ describedBy, invalid }">
            <FormInput
              id="tour-title"
              type="text"
              v-model="title"
              :invalid="invalid"
              :aria-describedby="describedBy"
              placeholder="Es. Gaeta medievale in mezza giornata"
            />
          </template>
        </FormField>

        <FormField
          field-id="tour-body"
          label="Introduzione"
          hint="Che giro è, per chi, cosa aspettarsi. Le tappe raccontano il resto."
          :errors="fieldErrors.body_html"
        >
          <template #default="{ describedBy }">
            <RichTextEditor
              v-model="bodyHtml"
              label="Introduzione dell’itinerario"
              :input-id="'tour-body'"
              :described-by="describedBy"
            />
          </template>
        </FormField>

        <!-- I2: the two forms, said in the words a collaborator decides by. -->
        <fieldset v-if="!isTranslation" class="space-y-2">
          <legend class="font-semibold text-ink">Che tipo di itinerario</legend>
          <label class="flex items-start gap-3">
            <input v-model="form" type="radio" value="percorso" class="mt-1 h-4 w-4" />
            <span>
              <span class="font-semibold text-ink">Percorso</span>
              <span class="block text-sm text-muted">
                Una gita in sequenza: le tappe si seguono, con il tragitto e la guida tappa per
                tappa.
              </span>
            </span>
          </label>
          <label class="flex items-start gap-3">
            <input v-model="form" type="radio" value="raccolta" class="mt-1 h-4 w-4" />
            <span>
              <span class="font-semibold text-ink">Raccolta</span>
              <span class="block text-sm text-muted">
                Luoghi da scegliere, senza ordine né tragitto — come le spiagge: una al giorno.
              </span>
            </span>
          </label>
        </fieldset>

        <FormField
          field-id="tour-duration"
          label="Durata indicativa"
          :errors="fieldErrors.duration"
        >
          <template #default="{ describedBy, invalid }">
            <FormInput
              id="tour-duration"
              type="text"
              v-model="duration"
              :invalid="invalid"
              :aria-describedby="describedBy"
              placeholder="Es. Mezza giornata"
            />
          </template>
        </FormField>

        <fieldset v-if="!isTranslation && intentOptions.length" class="space-y-2">
          <legend class="font-semibold text-ink">Per chi vuole…</legend>
          <label v-for="intent in intentOptions" :key="intent.slug" class="flex items-center gap-3">
            <input v-model="intents" type="checkbox" :value="intent.slug" class="h-4 w-4" />
            <span class="text-ink">{{ intent.name }}</span>
          </label>
          <p v-if="fieldErrors.intents" class="text-sm font-medium text-status-open" role="alert">
            {{ fieldErrors.intents.join(' ') }}
          </p>
        </fieldset>
      </fieldset>
    </div>

    <div
      v-show="tab === 'tappe'"
      id="tour-form-panel-tappe"
      role="tabpanel"
      aria-labelledby="tour-form-tab-tappe"
    >
      <fieldset class="space-y-4">
        <legend class="sr-only">Tappe</legend>
        <p v-if="fieldErrors.stops" class="text-sm font-medium text-status-open" role="alert">
          {{ fieldErrors.stops.join(' ') }}
        </p>
        <StopsField
          v-model="stops"
          :drawing="tab === 'tappe'"
          :joined="form === 'percorso'"
          :readonly="isTranslation"
          @done="tab = form === 'percorso' ? 'tragitto' : 'immagini'"
        />
      </fieldset>
    </div>

    <div
      v-if="form === 'percorso'"
      v-show="tab === 'tragitto'"
      id="tour-form-panel-tragitto"
      role="tabpanel"
      aria-labelledby="tour-form-tab-tragitto"
    >
      <fieldset class="space-y-4">
        <legend class="sr-only">Il tragitto</legend>
        <p class="text-muted">
          Facoltativo: il percorso a piedi tra le tappe, disegnato per le strade vere. Senza, la
          mappa unisce le tappe in linea retta.
        </p>
        <MapPointsField
          v-model="path"
          kind="route"
          route-noun="punto"
          :readonly="isTranslation"
          :drawing="tab === 'tragitto'"
          id-prefix="tour-path"
          @done="tab = 'immagini'"
        />
      </fieldset>
    </div>

    <div
      v-show="tab === 'immagini'"
      id="tour-form-panel-immagini"
      role="tabpanel"
      aria-labelledby="tour-form-tab-immagini"
    >
      <fieldset class="space-y-4">
        <legend class="sr-only">Immagini</legend>
        <template v-if="isTranslation">
          <p class="text-body text-muted">
            Le fotografie sono quelle dell’itinerario originale. Si modificano da lì.
          </p>
          <ul v-if="sharedImages.length" class="flex flex-wrap gap-3">
            <li v-for="image in sharedImages" :key="image.id">
              <img
                :src="image.imageURL"
                :alt="image.caption || title"
                class="h-20 w-20 rounded-lg object-cover"
              />
            </li>
          </ul>
        </template>
        <CardImagesField
          v-else
          field-id="tour-images"
          v-model:entries="imageEntries"
          v-model:removed-ids="removedImageIds"
          :errors="fieldErrors.images"
        />
      </fieldset>
    </div>

    <div
      v-show="tab === 'pubblicazione'"
      id="tour-form-panel-pubblicazione"
      role="tabpanel"
      aria-labelledby="tour-form-tab-pubblicazione"
    >
      <fieldset class="space-y-4">
        <legend class="sr-only">Pubblicazione</legend>
        <div class="flex items-start gap-3 rounded-lg border border-hairline bg-surface p-4">
          <input id="tour-published" type="checkbox" v-model="isPublished" class="mt-1 h-4 w-4" />
          <label for="tour-published" class="text-ink">
            Pubblica subito
            <span class="block text-sm text-muted">
              Si pubblica quando tutte le tappe sono pubblicate. Una bozza è visibile solo a te e
              agli amministratori.
            </span>
          </label>
        </div>
        <p
          v-if="fieldErrors.is_published"
          class="text-sm font-medium text-status-open"
          role="alert"
        >
          {{ fieldErrors.is_published.join(' ') }}
        </p>
      </fieldset>
    </div>

    <div
      v-if="formErrors.length > 0"
      class="rounded-lg border border-status-open bg-surface p-4"
      role="alert"
    >
      <p v-for="error in formErrors" :key="error" class="text-status-open">{{ error }}</p>
    </div>

    <div class="flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
      <ActionButton type="submit" :disabled="submitting">
        {{ tour ? 'Salva modifiche' : 'Crea itinerario' }}
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
