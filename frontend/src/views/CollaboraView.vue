<script setup lang="ts">
import axios from 'axios'

import { useToastStore } from '@/stores/toast'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { parseZodObject, CollaborateForm } from '@/forms/user'
import FormInput from '@/components/forms/FormInput.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import { extractApiErrors } from '@/lib/apiErrors'

const toastStore = useToastStore()
const router = useRouter()

const form = ref({
  name: '',
  email: '',
  message: '',
})

// Anti-spam (spec A1: "its job is spam, not identity") — not a CAPTCHA, a
// honeypot a bot fills and a real visitor never sees, plus a minimum time
// since the form rendered. Neither is user-facing, so neither is zod-validated.
const website = ref('')
const renderedAt = Date.now()

const formErrors = ref<string[]>([])

const resetForm = () => {
  form.value.name = ''
  form.value.email = ''
  form.value.message = ''
  website.value = ''
  formErrors.value = []
}

const submitForm = () => {
  const parsedData = parseZodObject(CollaborateForm, form.value)

  formErrors.value = []

  if (parsedData.errors.length > 0) {
    formErrors.value = [...parsedData.errors, ...formErrors.value]
    return
  }

  axios
    .post('/api/users/collaborate/', {
      ...parsedData.data,
      website: website.value,
      rendered_at: renderedAt,
    })
    .then(() => {
      toastStore.showToast(
        5000,
        'Richiesta inviata! Ti contatteremo se verrà approvata.',
        'bg-emerald-500',
      )

      resetForm()
      router.push('/')
    })
    .catch((error) => {
      formErrors.value = extractApiErrors(error)

      toastStore.showToast(5000, 'Qualcosa è andato storto. Riprova.', 'bg-red-300')
    })
}
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-2 gap-4">
    <div>
      <PanelBox>
        <MainTitle>Collabora con noi</MainTitle>

        <p class="mb-6 text-gray-500">
          Vivere Gaeta è scritto da un piccolo gruppo di collaboratori scelti dall'autore.
          Raccontaci chi sei e perché vuoi contribuire: ti risponderemo se la tua richiesta viene
          approvata.
        </p>

        <p class="font-bold">
          Hai già un account?
          <RouterLink :to="{ name: 'login' }" class="underline">Accedi qui</RouterLink>!
        </p>
      </PanelBox>
    </div>

    <div>
      <PanelBox>
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <div>
            <label for="collabora-name">Nome</label><br />
            <FormInput class="mt-2"
              id="collabora-name"
              type="text"
              v-model="form.name"
              placeholder="Il tuo nome completo"
            />
          </div>

          <div>
            <label for="collabora-email">E-mail</label><br />
            <FormInput class="mt-2"
              id="collabora-email"
              type="email"
              v-model="form.email"
              placeholder="La tua e-mail"
            />
          </div>

          <div>
            <label for="collabora-message">Messaggio</label><br />
            <textarea
              id="collabora-message"
              v-model="form.message"
              placeholder="Chi sei e perché vuoi collaborare"
              rows="5"
              class="w-full mt-2 py-4 px-6 border border-gray-200 rounded-lg"
            ></textarea>
          </div>

          <div class="sr-only" aria-hidden="true">
            <label>Non compilare questo campo</label>
            <input type="text" v-model="website" tabindex="-1" autocomplete="off" />
          </div>

          <template v-if="formErrors.length > 0">
            <div class="bg-red-50 text-red-800 rounded-lg p-6">
              <p v-for="error in formErrors" v-bind:key="error">{{ error }}</p>
            </div>
          </template>

          <div>
            <ActionButton>Invia richiesta</ActionButton>
          </div>
        </form>
      </PanelBox>
    </div>
  </div>
</template>
