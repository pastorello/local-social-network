<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'
import { parseZodObject, InviteAcceptForm } from '@/forms/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormColumn from '@/components/boxes/FormColumn.vue'
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
  const parsedData = parseZodObject(InviteAcceptForm, form.value)

  formErrors.value = parsedData.errors
  fieldErrors.value = parsedData.fieldErrors

  if (parsedData.errors.length > 0 || Object.keys(parsedData.fieldErrors).length > 0) {
    return
  }

  axios
    .post('/api/users/acceptinvite/', {
      ...parsedData.data,
      token: route.params.token,
    })
    .then(() => {
      // The browser now belongs to someone new: whoever was signed in here —
      // the author, trying the link on their own machine — must not survive
      // it, or the new collaborator goes on to write as them (accounts.md).
      // Only on success, so a dead link does not sign anyone out.
      void userStore.logout()
      toastStore.showToast(5000, 'Account attivato. Ora puoi accedere.')
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
  <FormColumn>
    <MainTitle>Attiva il tuo account</MainTitle>

    <p class="mb-6 text-muted">
      La tua richiesta di collaborazione è stata approvata. Scegli una password per completare
      l'attivazione.
    </p>

    <form class="space-y-6" v-on:submit.prevent="submitForm">
      <FormField field-id="invite-password1" label="Password" :errors="fieldErrors.password1">
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="invite-password1"
            type="password"
            autocomplete="new-password"
            v-model="form.password1"
            :invalid="invalid"
            :aria-describedby="describedBy"
          />
        </template>
      </FormField>

      <FormField
        field-id="invite-password2"
        label="Ripeti password"
        :errors="fieldErrors.password2"
      >
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="invite-password2"
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
        <ActionButton>Attiva account</ActionButton>
      </div>
    </form>
  </FormColumn>
</template>
