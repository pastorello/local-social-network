<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'

import { useToastStore } from '@/stores/toast'
import type Feste from '@/definitions/interfaces/Feste'
import type { CardImage, RoutePoint } from '@/definitions/interfaces/Feste'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import RichTextEditor from '@/components/content/RichTextEditor.vue'
import FesteRouteEditor from '@/components/content/FesteRouteEditor.vue'
import { extractApiErrors } from '@/lib/apiErrors'

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
const existingImages = ref<CardImage[]>(props.feste?.images ?? [])
const removedImageIds = ref<string[]>([])
const newFiles = ref<File[]>([])
const newPreviews = ref<string[]>([])

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
  formData.append('recurrence', recurrence.value)
  formData.append('programme', programme.value)
  formData.append('is_published', String(isPublished.value))
  formData.append('route', JSON.stringify(route.value))
  newFiles.value.forEach((file) => formData.append('images', file))
  if (props.feste && removedImageIds.value.length > 0) {
    formData.append('remove_image_ids', JSON.stringify(removedImageIds.value))
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
    formErrors.value = extractApiErrors(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-6" v-on:submit.prevent="submitForm">
    <div>
      <label class="font-semibold" for="feste-title">Titolo</label><br />
      <FormInput
        id="feste-title"
        type="text"
        v-model="title"
        placeholder="Es. Festa di Sant'Erasmo"
      />
    </div>

    <div>
      <span class="font-semibold">Testo</span>
      <RichTextEditor v-model="bodyHtml" label="Testo della scheda" />
    </div>

    <div>
      <label class="font-semibold" for="feste-recurrence">Ricorrenza</label><br />
      <FormInput
        id="feste-recurrence"
        type="text"
        v-model="recurrence"
        placeholder="Es. Ogni 9 giugno"
      />
    </div>

    <div>
      <label class="font-semibold" for="feste-programme">Programma</label><br />
      <textarea
        id="feste-programme"
        v-model="programme"
        rows="4"
        class="p-4 w-full bg-gray-100 rounded-lg"
        placeholder="Il programma della giornata..."
      ></textarea>
    </div>

    <div>
      <label class="font-semibold" for="feste-images">Immagini</label><br />
      <input
        id="feste-images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        @change="onFilesSelected"
      />
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

    <div>
      <label class="font-semibold">Percorso</label>
      <FesteRouteEditor v-model="route" />
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
        {{ feste ? 'Salva modifiche' : 'Crea scheda' }}
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
