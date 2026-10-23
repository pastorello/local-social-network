<script setup lang="ts">
import axios from 'axios'

import { useToastStore } from '@/stores/toast'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { parseZodObject, CollaborateForm } from '@/forms/user'
import FormErrors from '@/components/forms/FormErrors.vue'
import FormField from '@/components/forms/FormField.vue'
import FormInput from '@/components/forms/FormInput.vue'
import FormColumn from '@/components/boxes/FormColumn.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'

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
const fieldErrors = ref<Record<string, string[]>>({})

const resetForm = () => {
  form.value.name = ''
  form.value.email = ''
  form.value.message = ''
  website.value = ''
  formErrors.value = []
  fieldErrors.value = {}
}

const submitForm = () => {
  const parsedData = parseZodObject(CollaborateForm, form.value)

  formErrors.value = parsedData.errors
  fieldErrors.value = parsedData.fieldErrors

  if (parsedData.errors.length > 0 || Object.keys(parsedData.fieldErrors).length > 0) {
    return
  }

  axios
    .post('/api/users/collaborate/', {
      ...parsedData.data,
      website: website.value,
      rendered_at: renderedAt,
    })
    .then(() => {
      toastStore.showToast(5000, 'Richiesta inviata! Ti contatteremo se verrà approvata.')

      resetForm()
      router.push('/')
    })
    .catch((error) => {
      // Per field where the API named one — "questa e-mail ha già una
      // richiesta aperta" belongs under the e-mail box, not at the foot of the
      // form with nothing connecting the two.
      fieldErrors.value = extractFieldErrors(error)
      formErrors.value = extractFormErrors(error)

      toastStore.showToast(5000, 'Qualcosa è andato storto. Riprova.')
    })
}
</script>

<template>
  <FormColumn>
    <MainTitle>Collabora con noi</MainTitle>

    <p class="mb-6 text-muted">
      Vivere Gaeta è scritto da un piccolo gruppo di collaboratori scelti dall'autore. Raccontaci
      chi sei e perché vuoi contribuire: ti risponderemo se la tua richiesta viene approvata.
    </p>

    <form class="space-y-6" v-on:submit.prevent="submitForm">
      <FormField field-id="collabora-name" label="Nome" :errors="fieldErrors.name">
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="collabora-name"
            type="text"
            autocomplete="name"
            v-model="form.name"
            :invalid="invalid"
            :aria-describedby="describedBy"
            placeholder="Il tuo nome completo"
          />
        </template>
      </FormField>

      <FormField field-id="collabora-email" label="E-mail" :errors="fieldErrors.email">
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="collabora-email"
            type="email"
            autocomplete="email"
            v-model="form.email"
            :invalid="invalid"
            :aria-describedby="describedBy"
          />
        </template>
      </FormField>

      <FormField field-id="collabora-message" label="Messaggio" :errors="fieldErrors.message">
        <template #default="{ describedBy, invalid }">
          <textarea
            id="collabora-message"
            v-model="form.message"
            placeholder="Chi sei e perché vuoi collaborare"
            rows="5"
            :aria-describedby="describedBy"
            :aria-invalid="invalid || undefined"
            class="w-full rounded-lg border bg-surface px-4 py-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            :class="invalid ? 'border-status-open' : 'border-field'"
          ></textarea>
        </template>
      </FormField>

      <div class="sr-only" aria-hidden="true">
        <label for="collabora-website">Non compilare questo campo</label>
        <input
          id="collabora-website"
          type="text"
          v-model="website"
          tabindex="-1"
          autocomplete="off"
        />
      </div>

      <FormErrors :errors="formErrors" />

      <div>
        <ActionButton>Invia richiesta</ActionButton>
      </div>
    </form>

    <p class="mt-8 border-t border-hairline pt-6">
      Hai già un account?
      <RouterLink :to="{ name: 'login' }" class="font-semibold text-sea underline"
        >Accedi</RouterLink
      >
    </p>
  </FormColumn>
</template>
