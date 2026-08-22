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
import { extractApiErrors } from '@/lib/apiErrors'

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
    formErrors.value = extractApiErrors(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-6" v-on:submit.prevent="submitForm">
    <div>
      <label class="font-semibold" for="type-form-title">Titolo</label><br />
      <FormInput id="type-form-title" type="text" v-model="title" :placeholder="`Es. ${config.singularLabel}`" />
    </div>

    <div>
      <span class="font-semibold">Testo</span>
      <RichTextEditor v-model="bodyHtml" label="Testo della scheda" />
    </div>

    <div v-for="field in config.extraFields" :key="field.key">
      <label class="font-semibold" :for="`type-form-${field.key}`">{{ field.label }}</label><br />
      <FormInput
        v-if="field.kind === 'input'"
        :id="`type-form-${field.key}`"
        type="text"
        v-model="extraValues[field.key]"
        :placeholder="field.placeholder"
      />
      <textarea
        v-else
        :id="`type-form-${field.key}`"
        v-model="extraValues[field.key]"
        rows="4"
        class="mt-2 p-4 w-full bg-gray-100 rounded-lg"
        :placeholder="field.placeholder"
      ></textarea>
    </div>

    <div>
      <label class="font-semibold" for="type-form-images">Immagini</label><br />
      <input id="type-form-images" type="file" accept="image/jpeg,image/png,image/webp" multiple @change="onFilesSelected" />
      <div class="flex flex-wrap gap-2 mt-2">
        <div v-for="image in existingImages" :key="image.id" class="relative">
          <img :src="image.imageURL" class="w-24 h-24 object-cover rounded-lg" alt="" />
          <button
            type="button"
            class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs cursor-pointer"
            aria-label="Rimuovi immagine"
            @click="removeExistingImage(image.id)"
          >
            ✕
          </button>
        </div>
        <div v-for="(preview, index) in newPreviews" :key="`new-${index}`" class="relative">
          <img :src="preview" class="w-24 h-24 object-cover rounded-lg" alt="" />
          <button
            type="button"
            class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs cursor-pointer"
            aria-label="Rimuovi immagine"
            @click="removeNewFile(index)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <div v-if="config.mapMode === 'pins'">
      <label class="font-semibold">{{ config.maxPoints === 1 ? 'Punto sulla mappa' : 'Punti sulla mappa' }}</label>
      <MapPinsEditor v-model="pins" :max="config.maxPoints ?? 1" />
    </div>

    <div class="flex items-center gap-2">
      <input id="is-published" type="checkbox" v-model="isPublished" />
      <label for="is-published">Pubblica subito</label>
    </div>

    <template v-if="formErrors.length > 0">
      <div class="bg-red-50 text-red-800 rounded-lg p-4">
        <p v-for="error in formErrors" v-bind:key="error">{{ error }}</p>
      </div>
    </template>

    <div class="flex gap-3">
      <ActionButton type="submit" :disabled="submitting">
        {{ item ? 'Salva modifiche' : 'Crea scheda' }}
      </ActionButton>
      <button
        type="button"
        class="py-4 px-6 rounded-lg bg-gray-200 text-gray-700 cursor-pointer"
        @click="emit('cancel')"
      >
        Annulla
      </button>
    </div>
  </form>
</template>
