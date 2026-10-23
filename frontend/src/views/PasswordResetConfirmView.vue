<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'
import { parseZodObject, PasswordResetConfirmForm } from '@/forms/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import AccountColumn from '@/components/boxes/AccountColumn.vue'
import FormErrors from '@/components/forms/FormErrors.vue'
import FormField from '@/components/forms/FormField.vue'
import FormInput from '@/components/forms/FormInput.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()
const userStore = useUserStore()

const form = ref({
  password1: '',
  password2: '',
})
const formErrors = ref<string[]>([])
const fieldErrors = ref<Record<string, string[]>>({})

const submitForm = () => {
  const parsedData = parseZodObject(PasswordResetConfirmForm, form.value)

  formErrors.value = parsedData.errors
  fieldErrors.value = parsedData.fieldErrors

  if (parsedData.errors.length > 0 || Object.keys(parsedData.fieldErrors).length > 0) {
    return
  }

  axios
    .post('/api/users/confirmpasswordreset/', {
      ...parsedData.data,
      token: route.params.token,
    })
    .then(() => {
      // Same rule as activating an invite: the next step is signing in with
      // the new password, so no older session on this browser may stand in
      // for it — someone else's, or this account's own, which the server has
      // just revoked (TD-20) but whose access token would still look alive.
      void userStore.logout()
      toastStore.showToast(5000, 'Password aggiornata. Accedi di nuovo.')
      router.push('/login')
    })
    .catch((error) => {
      // Django's own password validators answer per field ("questa password
      // è troppo comune"), so the message lands under the box that caused it.
      fieldErrors.value = extractFieldErrors(error)
      formErrors.value = extractFormErrors(error)
    })
}
</script>

<template>
  <AccountColumn>
    <MainTitle>Reimposta password</MainTitle>

    <p class="mb-6 text-muted">Scegli una nuova password per il tuo account.</p>

    <form class="space-y-6" v-on:submit.prevent="submitForm">
      <FormField
        field-id="reset-confirm-password1"
        label="Nuova password"
        :errors="fieldErrors.password1"
      >
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="reset-confirm-password1"
            type="password"
            autocomplete="new-password"
            v-model="form.password1"
            :invalid="invalid"
            :aria-describedby="describedBy"
          />
        </template>
      </FormField>

      <FormField
        field-id="reset-confirm-password2"
        label="Ripeti password"
        :errors="fieldErrors.password2"
      >
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="reset-confirm-password2"
            type="password"
            autocomplete="new-password"
            v-model="form.password2"
            :invalid="invalid"
            :aria-describedby="describedBy"
          />
        </template>
      </FormField>

      <FormErrors :errors="formErrors" />

      <div>
        <ActionButton>Salva password</ActionButton>
      </div>
    </form>
  </AccountColumn>
</template>
