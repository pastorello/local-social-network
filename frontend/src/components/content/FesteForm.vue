<script setup lang="ts">
import axios from 'axios'
import { computed, ref } from 'vue'

import { useToastStore } from '@/stores/toast'
import type Feste from '@/definitions/interfaces/Feste'
import type { RoutePoint } from '@/definitions/interfaces/Feste'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import RichTextEditor from '@/components/content/RichTextEditor.vue'
import MapPointsField from '@/components/forms/MapPointsField.vue'
import FormTabs, { type FormTab } from '@/components/forms/FormTabs.vue'
import CardImagesField from '@/components/forms/CardImagesField.vue'
import FormField from '@/components/forms/FormField.vue'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'
import { appendImages, toEntries, type CardImageEntry } from '@/lib/cardImages'

const props = defineProps<{
  // when set, the form edits an existing feste instead of creating one
  feste?: Feste | null
}>()

const emit = defineEmits<{
  (e: 'saved', feste: Feste): void
  (e: 'cancel'): void
}>()

const toastStore = useToastStore()

const title = ref(props.feste?.title ?? '')
const bodyHtml = ref(props.feste?.body_html ?? '')
const recurrence = ref(props.feste?.recurrence ?? '')
const programme = ref(props.feste?.programme ?? '')
const isPublished = ref(props.feste?.is_published ?? false)
const route = ref<RoutePoint[]>(props.feste?.route ?? [])
const imageEntries = ref<CardImageEntry[]>(toEntries(props.feste?.images))
const removedImageIds = ref<(string | number)[]>([])

// The photographs and the procession's route belong to the original card, in
// every language (spec translations.md, 2026-09-09). A translation shows them
// and cannot edit them; the API refuses the write too, this only keeps the
// form from offering something that would be rejected.
const isTranslation = computed(() => props.feste?.translation_of != null)
const sharedImages = computed(() => props.feste?.images ?? [])

const formErrors = ref<string[]>([])
const fieldErrors = ref<Record<string, string[]>>({})
const submitting = ref(false)

// The sections as tabs (design.md D19), the route drawn on the map under the
// panel while its tab is open.
const tab = ref('contenuto')
const tabOf = (field: string): string => {
  if (['images', 'image_order', 'remove_image_ids'].includes(field)) return 'immagini'
  if (field === 'route') return 'percorso'
  if (field === 'is_published') return 'pubblicazione'
  return 'contenuto'
}
const tabs = computed<FormTab[]>(() => {
  const withErrors = new Set<string>(Object.keys(fieldErrors.value).map(tabOf))
  return [
    { key: 'contenuto', label: 'Contenuto' },
    { key: 'immagini', label: 'Immagini' },
    { key: 'percorso', label: 'Il percorso' },
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
  formData.append('recurrence', recurrence.value)
  formData.append('programme', programme.value)
  formData.append('is_published', String(isPublished.value))
  if (!isTranslation.value) {
    formData.append('route', JSON.stringify(route.value))
    appendImages(formData, imageEntries.value, removedImageIds.value)
  }

  submitting.value = true
  try {
    const config = { headers: { 'Content-Type': 'multipart/form-data' } }
    const response = props.feste
      ? await axios.patch(`/api/feste/${props.feste.id}/`, formData, config)
      : await axios.post('/api/feste/', formData, config)

    toastStore.showToast(
      5000,
      props.feste ? 'Scheda aggiornata!' : 'Scheda creata!',
      'bg-emerald-500',
    )
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
    <FormTabs v-model="tab" :tabs="tabs" id-prefix="feste-form" />

    <div
      v-show="tab === 'contenuto'"
      id="feste-form-panel-contenuto"
      role="tabpanel"
      aria-labelledby="feste-form-tab-contenuto"
    >
      <fieldset class="space-y-5">
        <legend class="sr-only">Contenuto</legend>

        <FormField
          field-id="feste-title"
          :label="isTranslation ? 'Nome tradotto' : 'Titolo'"
          :hint="
            isTranslation ? 'Il titolo resta quello italiano: questo compare sotto.' : undefined
          "
          :errors="fieldErrors.title"
        >
          <template #default="{ describedBy, invalid }">
            <FormInput
              id="feste-title"
              type="text"
              v-model="title"
              :invalid="invalid"
              :aria-describedby="describedBy"
              placeholder="Es. Festa di Sant'Erasmo"
            />
          </template>
        </FormField>

        <FormField
          field-id="feste-body"
          label="Testo"
          hint="Grassetto, corsivo, titoli, elenchi e link. Niente HTML incollato: viene ripulito dal server."
          :errors="fieldErrors.body_html"
        >
          <template #default="{ describedBy }">
            <RichTextEditor
              v-model="bodyHtml"
              label="Testo della scheda"
              input-id="feste-body"
              :described-by="describedBy"
            />
          </template>
        </FormField>

        <FormField
          field-id="feste-recurrence"
          label="Ricorrenza"
          hint="In parole, non una data: «ogni 9 giugno», «la seconda domenica di agosto»."
          :errors="fieldErrors.recurrence"
        >
          <template #default="{ describedBy, invalid }">
            <FormInput
              id="feste-recurrence"
              type="text"
              v-model="recurrence"
              :invalid="invalid"
              :aria-describedby="describedBy"
              placeholder="Es. Ogni 9 giugno"
            />
          </template>
        </FormField>

        <FormField field-id="feste-programme" label="Programma" :errors="fieldErrors.programme">
          <template #default="{ describedBy, invalid }">
            <textarea
              id="feste-programme"
              v-model="programme"
              rows="5"
              :aria-describedby="describedBy"
              :aria-invalid="invalid || undefined"
              class="w-full rounded-lg border bg-surface px-4 py-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              :class="invalid ? 'border-status-open' : 'border-field'"
              placeholder="Il programma della giornata..."
            ></textarea>
          </template>
        </FormField>
      </fieldset>
    </div>

    <div
      v-show="tab === 'immagini'"
      id="feste-form-panel-immagini"
      role="tabpanel"
      aria-labelledby="feste-form-tab-immagini"
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
          field-id="feste-images"
          v-model:entries="imageEntries"
          v-model:removed-ids="removedImageIds"
          :errors="fieldErrors.images"
        />
      </fieldset>
    </div>

    <div
      v-show="tab === 'percorso'"
      id="feste-form-panel-percorso"
      role="tabpanel"
      aria-labelledby="feste-form-tab-percorso"
    >
      <fieldset class="space-y-4">
        <legend class="sr-only">Il percorso</legend>
        <MapPointsField
          v-model="route"
          kind="route"
          :readonly="isTranslation"
          :drawing="tab === 'percorso'"
          id-prefix="feste-route"
          @done="tab = 'pubblicazione'"
        />
      </fieldset>
    </div>

    <div
      v-show="tab === 'pubblicazione'"
      id="feste-form-panel-pubblicazione"
      role="tabpanel"
      aria-labelledby="feste-form-tab-pubblicazione"
    >
      <fieldset class="space-y-4">
        <legend class="sr-only">Pubblicazione</legend>
        <div class="flex items-start gap-3 rounded-lg border border-hairline bg-surface p-4">
          <input id="feste-published" type="checkbox" v-model="isPublished" class="mt-1 h-4 w-4" />
          <label for="feste-published" class="text-ink">
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
        {{ feste ? 'Salva modifiche' : 'Crea scheda' }}
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
