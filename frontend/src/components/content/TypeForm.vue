<script setup lang="ts">
import axios from 'axios'
import { reactive, ref } from 'vue'

import { useToastStore } from '@/stores/toast'
import type { TypeConfig } from '@/definitions/typeConfigs'
import type { CardImage, ContentItem, MapPoint } from '@/definitions/interfaces/Content'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import RichTextEditor from '@/components/content/RichTextEditor.vue'
import MapPinsEditor from '@/components/content/MapPinsEditor.vue'
import FormField from '@/components/forms/FormField.vue'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'

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
const existingImages = ref<CardImage[]>(props.item?.images ?? [])
const removedImageIds = ref<string[]>([])
const newFiles = ref<File[]>([])
const newPreviews = ref<string[]>([])

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

const onFilesSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  newFiles.value.push(...files)
  files.forEach((file) => {
    const reader = new FileReader()
    reader.onload = (e) => newPreviews.value.push(e.target?.result as string)
    reader.readAsDataURL(file)
  })
  input.value = ''
}

const removeExistingImage = (id: string) => {
  existingImages.value = existingImages.value.filter((image) => image.id !== id)
  removedImageIds.value.push(id)
}

const removeNewFile = (index: number) => {
  newFiles.value.splice(index, 1)
  newPreviews.value.splice(index, 1)
}

const submitForm = async () => {
  formErrors.value = []
  if (!title.value.trim()) formErrors.value.push('Il titolo è obbligatorio.')
  if (!bodyHtml.value.trim()) formErrors.value.push('Il testo è obbligatorio.')
  if (formErrors.value.length > 0) return

  const formData = new FormData()
  formData.append('title', title.value.trim())
  formData.append('body_html', bodyHtml.value)
  formData.append('is_published', String(isPublished.value))
  for (const field of props.config.extraFields) {
    formData.append(field.key, extraValues[field.key] ?? '')
  }
  if (props.config.mapMode === 'pins') {
    formData.append('pins', JSON.stringify(pins.value))
  }
  newFiles.value.forEach((file) => formData.append('images', file))
  if (props.item && removedImageIds.value.length > 0) {
    formData.append('remove_image_ids', JSON.stringify(removedImageIds.value))
  }

  submitting.value = true
  try {
    const config = { headers: { 'Content-Type': 'multipart/form-data' } }
    const response = props.item
      ? await axios.patch(`${props.config.endpoint}${props.item.id}/`, formData, config)
      : await axios.post(props.config.endpoint, formData, config)

    toastStore.showToast(
      5000,
      props.item ? 'Scheda aggiornata!' : 'Scheda creata!',
      'bg-emerald-500',
    )
    emit('saved', response.data)
  } catch (error) {
    formErrors.value = extractFormErrors(error)
    fieldErrors.value = extractFieldErrors(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-8" v-on:submit.prevent="submitForm">
    <!-- Sections rather than one long stack: writing a card and giving it a
    place are different jobs, and desktop-first (D2) means there is room to
    say so. -->
    <fieldset class="space-y-5">
      <legend class="mb-4 font-display text-title text-ink">Contenuto</legend>

      <FormField field-id="type-form-title" label="Titolo" :errors="fieldErrors.title">
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="type-form-title"
            type="text"
            v-model="title"
            :invalid="invalid"
            :aria-describedby="describedBy"
            :placeholder="`Es. ${config.singularLabel}`"
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

    <fieldset class="space-y-4">
      <legend class="mb-4 font-display text-title text-ink">Immagini</legend>
      <FormField
        field-id="type-form-images"
        label="Aggiungi immagini"
        hint="La prima diventa la copertina della scheda. JPG, PNG o WebP, fino a 5 MB l’una."
        :errors="fieldErrors.images"
      >
        <template #default="{ describedBy }">
          <input
            id="type-form-images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            :aria-describedby="describedBy"
            class="w-full rounded-lg border border-field bg-surface px-4 py-3 text-sm text-ink file:mr-4 file:rounded file:border-0 file:bg-sea file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            @change="onFilesSelected"
          />
        </template>
      </FormField>

      <div v-if="existingImages.length || newPreviews.length" class="flex flex-wrap gap-3">
        <div v-for="image in existingImages" :key="image.id" class="relative">
          <img :src="image.imageURL" class="h-24 w-24 rounded-lg object-cover" alt="" />
          <button
            type="button"
            class="absolute -top-2 -right-2 h-6 w-6 cursor-pointer rounded-full bg-status-open text-xs text-white"
            aria-label="Rimuovi immagine"
            @click="removeExistingImage(image.id)"
          >
            ✕
          </button>
        </div>
        <div v-for="(preview, index) in newPreviews" :key="`new-${index}`" class="relative">
          <img :src="preview" class="h-24 w-24 rounded-lg object-cover" alt="" />
          <button
            type="button"
            class="absolute -top-2 -right-2 h-6 w-6 cursor-pointer rounded-full bg-status-open text-xs text-white"
            aria-label="Rimuovi immagine"
            @click="removeNewFile(index)"
          >
            ✕
          </button>
        </div>
      </div>
    </fieldset>

    <fieldset v-if="config.mapMode === 'pins'" class="space-y-4">
      <legend class="mb-4 font-display text-title text-ink">
        {{ config.maxPoints === 1 ? 'Il punto sulla mappa' : 'I punti sulla mappa' }}
      </legend>
      <MapPinsEditor v-model="pins" :max="config.maxPoints ?? 1" />
    </fieldset>

    <fieldset class="space-y-4">
      <legend class="mb-4 font-display text-title text-ink">Pubblicazione</legend>
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
