<script setup lang="ts">
import axios from 'axios'
import { computed, reactive, ref } from 'vue'

import { useToastStore } from '@/stores/toast'
import type { TypeConfig } from '@/definitions/typeConfigs'
import type { ContentItem, MapPoint } from '@/definitions/interfaces/Content'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import RichTextEditor from '@/components/content/RichTextEditor.vue'
import MapPinsEditor from '@/components/content/MapPinsEditor.vue'
import CardImagesField from '@/components/forms/CardImagesField.vue'
import FormField from '@/components/forms/FormField.vue'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'
import { appendImages, toEntries, type CardImageEntry } from '@/lib/cardImages'

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
  if (props.config.mapMode === 'pins' && !isTranslation.value) {
    formData.append('pins', JSON.stringify(pins.value))
  }
  if (!isTranslation.value) {
    appendImages(formData, imageEntries.value, removedImageIds.value)
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

      <!-- On a translation the title is the translated name, which the
      article shows *under* the Italian one (2026-09-09) — so the label says
      that, rather than asking for a "title" the reader will never see as the
      heading. -->
      <FormField
        field-id="type-form-title"
        :label="isTranslation ? 'Nome tradotto' : 'Titolo'"
        :hint="isTranslation ? 'Il titolo resta quello italiano: questo compare sotto.' : undefined"
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

    <fieldset v-if="config.mapMode === 'pins'" class="space-y-4">
      <legend class="mb-4 font-display text-title text-ink">
        {{ config.maxPoints === 1 ? 'Il punto sulla mappa' : 'I punti sulla mappa' }}
      </legend>
      <p v-if="isTranslation" class="text-body text-muted">
        Il luogo è quello della scheda originale. Si sposta da lì.
      </p>
      <MapPinsEditor v-model="pins" :max="config.maxPoints ?? 1" :readonly="isTranslation" />
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
