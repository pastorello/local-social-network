<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'

import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import { extractApiErrors } from '@/lib/apiErrors'
import { useToastStore } from '@/stores/toast'
import type Poll from '@/definitions/interfaces/Poll'

const emit = defineEmits<{
  (e: 'saved', poll: Poll): void
  (e: 'cancel'): void
}>()

const toastStore = useToastStore()

// Spec F3.1: 2–10 options.
const MAX_OPTIONS = 10

const question = ref('')
const options = ref<string[]>(['', ''])
const closesAt = ref('')
const formErrors = ref<string[]>([])
const submitting = ref(false)

const addOption = () => {
  if (options.value.length < MAX_OPTIONS) options.value.push('')
}

const removeOption = (index: number) => {
  if (options.value.length > 2) options.value.splice(index, 1)
}

const updateOption = (index: number, value: string) => {
  options.value.splice(index, 1, value)
}

const submitForm = async () => {
  formErrors.value = []
  const trimmedOptions = options.value.map((text) => text.trim()).filter((text) => text !== '')

  if (!question.value.trim()) formErrors.value.push('La domanda è obbligatoria.')
  if (trimmedOptions.length < 2) formErrors.value.push('Inserisci almeno 2 opzioni.')
  if (formErrors.value.length > 0) return

  submitting.value = true
  try {
    const response = await axios.post('/api/polls/', {
      question: question.value.trim(),
      options: trimmedOptions,
      closes_at: closesAt.value ? new Date(closesAt.value).toISOString() : null,
    })
    toastStore.showToast(5000, 'Sondaggio creato!', 'bg-emerald-500')
    emit('saved', response.data)
  } catch (error) {
    formErrors.value = extractApiErrors(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-4" v-on:submit.prevent="submitForm">
    <div>
      <label class="font-semibold">Domanda</label><br />
      <FormInput
        type="text"
        v-model="question"
        placeholder="Es. Dove costruire la nuova area giochi?"
      />
    </div>

    <div>
      <label class="font-semibold">Opzioni (da 2 a 10)</label>
      <div v-for="(option, index) in options" :key="index" class="flex items-center gap-2">
        <input
          type="text"
          :value="option"
          @input="updateOption(index, ($event.target as HTMLInputElement).value)"
          :placeholder="`Opzione ${index + 1}`"
          class="mt-2 w-full flex-1 rounded-lg border border-gray-200 py-4 px-6"
        />
        <button
          v-if="options.length > 2"
          type="button"
          class="mt-2 cursor-pointer rounded-lg bg-gray-200 px-4 py-4 text-gray-700"
          :aria-label="`Rimuovi opzione ${index + 1}`"
          @click="removeOption(index)"
        >
          ✕
        </button>
      </div>
      <button
        v-if="options.length < MAX_OPTIONS"
        type="button"
        class="mt-2 cursor-pointer text-sm text-purple-700 underline"
        @click="addOption"
      >
        + Aggiungi opzione
      </button>
    </div>

    <div>
      <label class="font-semibold">Data di chiusura (facoltativa)</label><br />
      <input
        type="datetime-local"
        v-model="closesAt"
        class="mt-2 rounded-lg border border-gray-200 py-4 px-6"
      />
    </div>

    <template v-if="formErrors.length > 0">
      <div class="rounded-lg bg-red-300 p-4 text-white">
        <p v-for="error in formErrors" v-bind:key="error">{{ error }}</p>
      </div>
    </template>

    <div class="flex gap-3">
      <ActionButton type="submit" :disabled="submitting">Crea sondaggio</ActionButton>
      <button
        type="button"
        class="cursor-pointer rounded-lg bg-gray-200 py-4 px-6 text-gray-700"
        @click="emit('cancel')"
      >
        Annulla
      </button>
    </div>
  </form>
</template>
