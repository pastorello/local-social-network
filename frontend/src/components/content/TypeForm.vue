<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, reactive, ref } from 'vue'

import { useToastStore } from '@/stores/toast'
import type { TypeConfig } from '@/definitions/typeConfigs'
import type { Availability, ContentItem, MapPoint } from '@/definitions/interfaces/Content'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import RichTextEditor from '@/components/content/RichTextEditor.vue'
import MapPointsField from '@/components/forms/MapPointsField.vue'
import FormTabs, { type FormTab } from '@/components/forms/FormTabs.vue'
import CardImagesField from '@/components/forms/CardImagesField.vue'
import FormField from '@/components/forms/FormField.vue'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'
import { appendImages, toEntries, type CardImageEntry } from '@/lib/cardImages'
import { STATE_OPTIONS, emptyAvailability } from '@/lib/availability'

const props = defineProps<{
  config: TypeConfig
  // when set, the form edits an existing item instead of creating one
  item?: ContentItem | null
}>()

const emit = defineEmits<{
  (e: 'saved', item: ContentItem): void
  (e: 'cancel'): void
}>()

const toastStore = useToastStore()

const title = ref((props.item?.title as string) ?? '')
const bodyHtml = ref((props.item?.body_html as string) ?? '')
const isPublished = ref((props.item?.is_published as boolean) ?? false)
const pins = ref<MapPoint[]>((props.item?.pins as MapPoint[]) ?? [])
const imageEntries = ref<CardImageEntry[]>(toEntries(props.item?.images))
const removedImageIds = ref<(string | number)[]>([])

// The photographs and the map belong to the original card, in every language
// (spec translations.md, 2026-09-09): one place, one picture, one pin. So a
// translation shows them and cannot edit them — the API refuses the write too,
// this only keeps the form from offering something that would be rejected.
const isTranslation = computed(() => props.item?.translation_of != null)
const sharedImages = computed(() => props.item?.images ?? [])

// A type with a door (ADR-0008): what is known about getting in, which is the
// original's in every language — so a translation shows it and cannot edit
// it, like the photographs — and, on a church, «Se la trovi chiusa», which is
// written per language (cosa-fare.md D7).
const visit = reactive<Availability>({
  ...emptyAvailability(),
  ...(props.item?.availability as Availability | undefined),
})
const stateOptions = computed(() =>
  STATE_OPTIONS.filter((option) => option.value !== 'no_door' || props.config.visit?.noDoor),
)
// A business's door is its hours and nothing else (ADR-0010): no way in to
// choose, no keeper — the API refuses them.
const hoursOnly = computed(() => !!props.config.visit?.hoursOnly)
const fromOutside = ref((props.item?.from_outside as string | undefined) ?? '')

const extraValues = reactive<Record<string, string>>(
  Object.fromEntries(
    props.config.extraFields.map((field) => [field.key, (props.item?.[field.key] as string) ?? '']),
  ),
)

const formErrors = ref<string[]>([])
// Kept per field as well as flat, so a message can sit next to the input it is
// about (ADR-0005) instead of only at the bottom of the form.
const fieldErrors = ref<Record<string, string[]>>({})
const submitting = ref(false)

// A 'select' field's choices come from the API, not from the config: luoghi's
// genres are an admin-managed list (spec content.md). Every options endpoint
// answers with `{slug, name}` rows.
const selectOptions = reactive<Record<string, { slug: string; name: string }[]>>({})

onMounted(async () => {
  for (const field of props.config.extraFields) {
    if (field.kind !== 'select' || !field.optionsEndpoint) continue
    try {
      const response = await axios.get<{ slug: string; name: string }[]>(field.optionsEndpoint)
      selectOptions[field.key] = response.data
    } catch {
      formErrors.value.push(`Non è stato possibile caricare le scelte per «${field.label}».`)
    }
  }
})

// The sections as tabs (design.md D19). The map's tab is where the card's
// place is drawn — on the map under the panel, not in a map of its own.
const tab = ref('contenuto')
const tabOf = (field: string): string => {
  if (['images', 'image_order', 'remove_image_ids'].includes(field)) return 'immagini'
  if (field === 'pins') return 'mappa'
  if (field === 'availability' || field === 'from_outside') return 'visita'
  if (field === 'is_published') return 'pubblicazione'
  return 'contenuto'
}
const tabs = computed<FormTab[]>(() => {
  const withErrors = new Set<string>(Object.keys(fieldErrors.value).map(tabOf))
  const all = [
    { key: 'contenuto', label: 'Contenuto' },
    { key: 'immagini', label: 'Immagini' },
    ...(props.config.mapMode === 'pins' ? [{ key: 'mappa', label: 'Mappa' }] : []),
    ...(props.config.visit ? [{ key: 'visita', label: hoursOnly.value ? 'Orari' : 'Visita' }] : []),
    { key: 'pubblicazione', label: 'Pubblicazione' },
  ]
  return all.map((entry) => ({ ...entry, hasError: withErrors.has(entry.key) }))
})

const submitForm = async () => {
  formErrors.value = []
  if (!title.value.trim()) formErrors.value.push('Il titolo è obbligatorio.')
  if (!bodyHtml.value.trim()) formErrors.value.push('Il testo è obbligatorio.')
  if (formErrors.value.length > 0) {
    // Both are on the first tab: show the reader the fields the message is about.
    tab.value = 'contenuto'
    return
  }

  const formData = new FormData()
  formData.append('title', title.value.trim())
  formData.append('body_html', bodyHtml.value)
  formData.append('is_published', String(isPublished.value))
  for (const field of props.config.extraFields) {
    formData.append(field.key, extraValues[field.key] ?? '')
  }
  if (props.config.mapMode === 'pins' && !isTranslation.value) {
    formData.append('pins', JSON.stringify(pins.value))
  }
  if (!isTranslation.value) {
    appendImages(formData, imageEntries.value, removedImageIds.value)
  }
  if (props.config.visit) {
    if (!isTranslation.value) {
      // The date is not sent: the server sets it when the hours change.
      const { state, hours, keeper, keeper_phone } = visit
      formData.append('availability', JSON.stringify({ state, hours, keeper, keeper_phone }))
    }
    if (props.config.visit.fromOutside) formData.append('from_outside', fromOutside.value)
  }

  submitting.value = true
  try {
    const config = { headers: { 'Content-Type': 'multipart/form-data' } }
    const response = props.item
      ? await axios.patch(`${props.config.endpoint}${props.item.id}/`, formData, config)
      : await axios.post(props.config.endpoint, formData, config)

    toastStore.showToast(5000, props.item ? 'Scheda aggiornata!' : 'Scheda creata!')
    emit('saved', response.data)
  } catch (error) {
    formErrors.value = extractFormErrors(error)
    fieldErrors.value = extractFieldErrors(error)
    // A rejected field may be on a tab that is not open: open the first one.
    const firstRejected = Object.keys(fieldErrors.value)[0]
    if (firstRejected) tab.value = tabOf(firstRejected)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-8" v-on:submit.prevent="submitForm">
    <!-- Sections rather than one long stack: writing a card and giving it a
    place are different jobs. Since D19 they are tabs, because the panel is
    beside the map and a long stack would be an endless scroll. -->
    <FormTabs v-model="tab" :tabs="tabs" id-prefix="type-form" />

    <div
      v-show="tab === 'contenuto'"
      id="type-form-panel-contenuto"
      role="tabpanel"
      aria-labelledby="type-form-tab-contenuto"
    >
      <fieldset class="space-y-5">
        <legend class="sr-only">Contenuto</legend>

        <!-- On a translation the title is the translated name, which the
      article shows *under* the Italian one (2026-09-09) — so the label says
      that, rather than asking for a "title" the reader will never see as the
      heading. -->
        <FormField
          field-id="type-form-title"
          :label="isTranslation ? 'Nome tradotto' : 'Titolo'"
          :hint="
            isTranslation ? 'Il titolo resta quello italiano: questo compare sotto.' : undefined
          "
          :errors="fieldErrors.title"
        >
          <template #default="{ describedBy, invalid }">
            <FormInput
              id="type-form-title"
              type="text"
              v-model="title"
              :invalid="invalid"
              :aria-describedby="describedBy"
              :placeholder="config.titlePlaceholder ?? `Es. ${config.singularLabel}`"
            />
          </template>
        </FormField>

        <FormField
          field-id="type-form-body"
          label="Testo"
          hint="Grassetto, corsivo, titoli, elenchi e link. Niente HTML incollato: viene ripulito dal server."
          :errors="fieldErrors.body_html"
        >
          <template #default="{ describedBy }">
            <RichTextEditor
              v-model="bodyHtml"
              label="Testo della scheda"
              :input-id="'type-form-body'"
              :described-by="describedBy"
            />
          </template>
        </FormField>

        <FormField
          v-for="field in config.extraFields"
          :key="field.key"
          :field-id="`type-form-${field.key}`"
          :label="field.label"
          :errors="fieldErrors[field.key]"
        >
          <template #default="{ describedBy, invalid }">
            <FormInput
              v-if="field.kind === 'input'"
              :id="`type-form-${field.key}`"
              type="text"
              v-model="extraValues[field.key]"
              :invalid="invalid"
              :aria-describedby="describedBy"
              :placeholder="field.placeholder"
            />
            <select
              v-else-if="field.kind === 'select'"
              :id="`type-form-${field.key}`"
              v-model="extraValues[field.key]"
              :aria-describedby="describedBy"
              :aria-invalid="invalid || undefined"
              class="w-full rounded-lg border bg-surface px-4 py-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              :class="invalid ? 'border-status-open' : 'border-field'"
            >
              <option value="" disabled>{{ field.placeholder ?? 'Scegli' }}</option>
              <option
                v-for="option in selectOptions[field.key] ?? []"
                :key="option.slug"
                :value="option.slug"
              >
                {{ option.name }}
              </option>
            </select>
            <textarea
              v-else
              :id="`type-form-${field.key}`"
              v-model="extraValues[field.key]"
              rows="5"
              :aria-describedby="describedBy"
              :aria-invalid="invalid || undefined"
              class="w-full rounded-lg border bg-surface px-4 py-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              :class="invalid ? 'border-status-open' : 'border-field'"
              :placeholder="field.placeholder"
            ></textarea>
          </template>
        </FormField>
      </fieldset>
    </div>

    <div
      v-show="tab === 'immagini'"
      id="type-form-panel-immagini"
      role="tabpanel"
      aria-labelledby="type-form-tab-immagini"
    >
      <fieldset class="space-y-4">
        <legend class="sr-only">Immagini</legend>
        <template v-if="isTranslation">
          <p class="text-body text-muted">
            Le fotografie sono quelle della scheda originale, per ogni lingua. Si modificano da lì.
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
          field-id="type-form-images"
          :hint-suffix="config.imagesHint"
          v-model:entries="imageEntries"
          v-model:removed-ids="removedImageIds"
          :errors="fieldErrors.images"
        />
      </fieldset>
    </div>

    <div
      v-if="config.mapMode === 'pins'"
      v-show="tab === 'mappa'"
      id="type-form-panel-mappa"
      role="tabpanel"
      aria-labelledby="type-form-tab-mappa"
    >
      <fieldset class="space-y-4">
        <legend class="sr-only">
          {{ config.maxPoints === 1 ? 'Il punto sulla mappa' : 'I punti sulla mappa' }}
        </legend>
        <MapPointsField
          v-model="pins"
          kind="pins"
          :max="config.maxPoints ?? 1"
          :readonly="isTranslation"
          :drawing="tab === 'mappa'"
          id-prefix="map-pins"
          @done="tab = 'pubblicazione'"
        />
      </fieldset>
    </div>

    <div
      v-if="config.visit"
      v-show="tab === 'visita'"
      id="type-form-panel-visita"
      role="tabpanel"
      aria-labelledby="type-form-tab-visita"
    >
      <fieldset class="space-y-5">
        <legend class="sr-only">{{ hoursOnly ? 'Orari' : 'Visita' }}</legend>
        <!-- ADR-0008: what is written here is shown with the day it was
        written, never as a promise — so the form asks for what the writer
        knows, and empty is a correct answer. -->
        <p v-if="isTranslation" class="text-body text-muted">
          {{ hoursOnly ? 'Gli orari sono' : 'Orari e custode sono' }} quelli della scheda originale,
          per ogni lingua. Si modificano da lì.
        </p>
        <template v-else>
          <p class="text-body text-muted">
            Scrivi solo quello che sai. Se non lo sai, lascia vuoto: vuoto è meglio di sbagliato, e
            la scheda funziona lo stesso.
          </p>
          <FormField
            v-if="!hoursOnly"
            field-id="type-form-visit-state"
            label="Come si entra"
            :errors="fieldErrors.availability"
          >
            <template #default="{ describedBy, invalid }">
              <select
                id="type-form-visit-state"
                v-model="visit.state"
                :aria-describedby="describedBy"
                :aria-invalid="invalid || undefined"
                class="w-full rounded-lg border bg-surface px-4 py-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
                :class="invalid ? 'border-status-open' : 'border-field'"
              >
                <option v-for="option in stateOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </template>
          </FormField>
          <FormField
            field-id="type-form-visit-hours"
            label="Orari"
            hint="Come li diresti a voce. Accanto comparirà la data di oggi: chi legge saprà quando sono stati segnalati."
            :errors="hoursOnly ? fieldErrors.availability : undefined"
          >
            <template #default="{ describedBy, invalid }">
              <textarea
                id="type-form-visit-hours"
                v-model="visit.hours"
                rows="3"
                :aria-describedby="describedBy"
                :aria-invalid="invalid || undefined"
                class="w-full rounded-lg border bg-surface px-4 py-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
                :class="invalid ? 'border-status-open' : 'border-field'"
                :placeholder="
                  hoursOnly
                    ? 'Es. Tutti i giorni 7-24; d’inverno chiuso il lunedì'
                    : 'Es. Lun-Sab 10:30-12:30 e 16:00-17:00; domenica solo per la messa delle 11'
                "
              ></textarea>
            </template>
          </FormField>
          <FormField v-if="!hoursOnly" field-id="type-form-visit-keeper" label="Chi ha le chiavi">
            <template #default="{ describedBy }">
              <FormInput
                id="type-form-visit-keeper"
                type="text"
                v-model="visit.keeper"
                :aria-describedby="describedBy"
                placeholder="Es. Parrocchia della Cattedrale"
              />
            </template>
          </FormField>
          <FormField v-if="!hoursOnly" field-id="type-form-visit-phone" label="Telefono">
            <template #default="{ describedBy }">
              <FormInput
                id="type-form-visit-phone"
                type="tel"
                v-model="visit.keeper_phone"
                :aria-describedby="describedBy"
                placeholder="Es. 0771 462255"
              />
            </template>
          </FormField>
        </template>

        <FormField
          v-if="config.visit.fromOutside"
          field-id="type-form-from-outside"
          label="Se la trovi chiusa"
          hint="La legge qualcuno che è già lì e ha trovato la porta chiusa. Scrivi che cosa ha davanti e che cosa può fare nei dieci minuti che gli restano. Fatti, non consolazioni — e niente orari."
          :errors="fieldErrors.from_outside"
        >
          <template #default="{ describedBy, invalid }">
            <textarea
              id="type-form-from-outside"
              v-model="fromOutside"
              rows="4"
              :aria-describedby="describedBy"
              :aria-invalid="invalid || undefined"
              class="w-full rounded-lg border bg-surface px-4 py-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              :class="invalid ? 'border-status-open' : 'border-field'"
              placeholder="Es. La facciata e il campanile si vedono dal sagrato; a cinquanta metri c'è il belvedere sul porto."
            ></textarea>
          </template>
        </FormField>
      </fieldset>
    </div>

    <div
      v-show="tab === 'pubblicazione'"
      id="type-form-panel-pubblicazione"
      role="tabpanel"
      aria-labelledby="type-form-tab-pubblicazione"
    >
      <fieldset class="space-y-4">
        <legend class="sr-only">Pubblicazione</legend>
        <div class="flex items-start gap-3 rounded-lg border border-hairline bg-surface p-4">
          <input id="is-published" type="checkbox" v-model="isPublished" class="mt-1 h-4 w-4" />
          <label for="is-published" class="text-ink">
            Pubblica subito
            <span class="block text-sm text-muted">
              Una bozza è visibile solo a te e agli amministratori.
            </span>
          </label>
        </div>
      </fieldset>
    </div>

    <div
      v-if="formErrors.length > 0"
      class="rounded-lg border border-status-open bg-surface p-4"
      role="alert"
    >
      <p v-for="error in formErrors" v-bind:key="error" class="text-status-open">{{ error }}</p>
    </div>

    <div class="flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
      <ActionButton type="submit" :disabled="submitting">
        {{ item ? 'Salva modifiche' : 'Crea scheda' }}
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
