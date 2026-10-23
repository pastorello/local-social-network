<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'

import { useToastStore } from '@/stores/toast'
import { parseZodObject, PasswordResetRequestForm } from '@/forms/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormColumn from '@/components/boxes/FormColumn.vue'
import FormErrors from '@/components/forms/FormErrors.vue'
import FormField from '@/components/forms/FormField.vue'
import FormInput from '@/components/forms/FormInput.vue'
import MainTitle from '@/components/typography/MainTitle.vue'

const toastStore = useToastStore()

const form = ref({ email: '' })
const formErrors = ref<string[]>([])
const fieldErrors = ref<Record<string, string[]>>({})
const sent = ref(false)

const submitForm = () => {
  const parsedData = parseZodObject(PasswordResetRequestForm, form.value)

  formErrors.value = parsedData.errors
  fieldErrors.value = parsedData.fieldErrors

  if (parsedData.errors.length > 0 || Object.keys(parsedData.fieldErrors).length > 0) {
    return
  }

  // The backend always answers 200 here regardless of whether the address is
  // registered (enumeration prevention), so there is nothing to branch on —
  // the request itself is treated as unconditional success.
  axios
    .post('/api/users/requestpasswordreset/', parsedData.data)
    .then(() => {
      sent.value = true
    })
    .catch(() => {
      toastStore.showToast(5000, 'Qualcosa è andato storto. Riprova.')
    })
}
</script>

<template>
  <FormColumn>
    <MainTitle>Password dimenticata</MainTitle>

    <p v-if="sent">Se l'indirizzo esiste, riceverai un'e-mail a breve.</p>
    <template v-else>
      <p class="mb-6 text-muted">
        Inserisci la tua e-mail: se corrisponde a un account, riceverai un link per reimpostare la
        password.
      </p>

      <form class="space-y-6" v-on:submit.prevent="submitForm">
        <FormField field-id="reset-request-email" label="E-mail" :errors="fieldErrors.email">
          <template #default="{ describedBy, invalid }">
            <FormInput
              id="reset-request-email"
              type="email"
              autocomplete="username"
              v-model="form.email"
              :invalid="invalid"
              :aria-describedby="describedBy"
            />
          </template>
        </FormField>

        <FormErrors :errors="formErrors" />

        <div>
          <ActionButton>Invia link</ActionButton>
        </div>
      </form>
    </template>
  </FormColumn>
</template>
