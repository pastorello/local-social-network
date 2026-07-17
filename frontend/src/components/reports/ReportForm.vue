<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'

import { useFileUpload } from '@/composables/useFileUpload'
import { useToastStore } from '@/stores/toast'
import type Category from '@/definitions/interfaces/Category'
import type Report from '@/definitions/interfaces/Report'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'

const props = defineProps<{
  categories: Category[]
  coords: { lat: number; lng: number }
  // when set, the form edits an existing report instead of creating one
  report?: Report | null
}>()

const emit = defineEmits<{
  (e: 'saved', report: Report): void
  (e: 'cancel'): void
}>()

const toastStore = useToastStore()

const title = ref(props.report?.title ?? '')
const description = ref(props.report?.description ?? '')
const categoryId = ref(props.report?.category.id ?? '')
const formErrors = ref<string[]>([])
const submitting = ref(false)
const { url, fileInput, onFileChange, resetFile } = useFileUpload()

const submitForm = async () => {
  formErrors.value = []

  if (!title.value.trim()) formErrors.value.push('Il titolo è obbligatorio.')
  if (!description.value.trim()) formErrors.value.push('La descrizione è obbligatoria.')
  if (!categoryId.value) formErrors.value.push('Scegli una categoria.')
  if (formErrors.value.length > 0) return

  const formData = new FormData()
  formData.append('title', title.value.trim())
  formData.append('description', description.value.trim())
  formData.append('category', categoryId.value)
  formData.append('lat', String(props.coords.lat))
  formData.append('lng', String(props.coords.lng))
  const photo = fileInput.value?.files?.[0]
  if (photo) {
    formData.append('photo', photo)
  }

  submitting.value = true
  try {
    const config = { headers: { 'Content-Type': 'multipart/form-data' } }
    const response = props.report
      ? await axios.patch(`/api/reports/${props.report.id}/`, formData, config)
      : await axios.post('/api/reports/', formData, config)

    toastStore.showToast(
      5000,
      props.report ? 'Segnalazione aggiornata!' : 'Segnalazione inviata. Grazie!',
      'bg-emerald-500',
    )
    resetFile()
    emit('saved', response.data)
  } catch (error) {
    const fields = (error as { response?: { data?: { fields?: Record<string, string[]> } } })
      .response?.data?.fields
    formErrors.value = fields
      ? Object.values(fields).flat()
      : ['Si è verificato un errore. Riprova.']
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-4" v-on:submit.prevent="submitForm">
    <div>
      <label class="font-semibold">Titolo</label><br />
      <FormInput type="text" v-model="title" placeholder="Es. Buca in via Indipendenza" />
    </div>

    <div>
      <label class="font-semibold">Descrizione</label><br />
      <textarea
        v-model="description"
        rows="4"
        class="p-4 w-full bg-gray-100 rounded-lg"
        placeholder="Descrivi il problema..."
      ></textarea>
    </div>

    <div>
      <label class="font-semibold">Categoria</label><br />
      <select v-model="categoryId" class="p-4 w-full bg-gray-100 rounded-lg">
        <option value="" disabled>Scegli una categoria...</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.name }}
        </option>
      </select>
    </div>

    <div>
      <label class="font-semibold">Foto (facoltativa, max 5 MB)</label><br />
      <input type="file" ref="fileInput" accept="image/jpeg,image/png,image/webp" @change="onFileChange" />
      <div v-if="url" class="mt-2">
        <img :src="url" class="w-32 rounded-lg" alt="Anteprima foto" />
      </div>
    </div>

    <template v-if="formErrors.length > 0">
      <div class="bg-red-300 text-white rounded-lg p-4">
        <p v-for="error in formErrors" v-bind:key="error">{{ error }}</p>
      </div>
    </template>

    <div class="flex gap-3">
      <ActionButton type="submit" :disabled="submitting">
        {{ report ? 'Salva modifiche' : 'Invia segnalazione' }}
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
