<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import AccountColumn from '@/components/boxes/AccountColumn.vue'
import FormErrors from '@/components/forms/FormErrors.vue'
import FormField from '@/components/forms/FormField.vue'
import FormInput from '@/components/forms/FormInput.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'

const toastStore = useToastStore()
const userStore = useUserStore()
const router = useRouter()

const form = ref({
  old_password: '',
  new_password1: '',
  new_password2: '',
})
const formErrors = ref<string[]>([])
const fieldErrors = ref<Record<string, string[]>>({})

const submitForm = () => {
  formErrors.value = []
  fieldErrors.value = {}

  if (form.value.new_password1 !== form.value.new_password2) {
    // On the confirmation box, which is the one to correct.
    fieldErrors.value.new_password2 = ['Le due password non corrispondono.']
  }

  if (Object.keys(fieldErrors.value).length === 0) {
    const formData = new FormData()
    formData.append('old_password', form.value.old_password)
    formData.append('new_password1', form.value.new_password1)
    formData.append('new_password2', form.value.new_password2)

    axios
      .post('/api/users/editpassword/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then(() => {
        // The backend revokes every outstanding token on a password change
        // (TD-20), so this session is over — say so instead of letting the next
        // request 401 on its own.
        userStore.removeToken()
        toastStore.showToast(5000, 'Password aggiornata. Accedi di nuovo.')
        router.push('/login')
      })
      .catch((error) => {
        // Django's validators answer per field — "questa password è troppo
        // comune" belongs under the new-password box.
        fieldErrors.value = extractFieldErrors(error)
        formErrors.value = extractFormErrors(error)
      })
  }
}
</script>

<template>
  <AccountColumn>
    <MainTitle>Cambia password</MainTitle>

    <p class="mb-6 text-muted">Da qui puoi cambiare la tua password.</p>

    <form class="space-y-6" v-on:submit.prevent="submitForm">
      <FormField
        field-id="editpassword-old"
        label="Password attuale"
        :errors="fieldErrors.old_password"
      >
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="editpassword-old"
            type="password"
            autocomplete="current-password"
            v-model="form.old_password"
            :invalid="invalid"
            :aria-describedby="describedBy"
          />
        </template>
      </FormField>

      <FormField
        field-id="editpassword-new1"
        label="Nuova password"
        :errors="fieldErrors.new_password1"
      >
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="editpassword-new1"
            type="password"
            autocomplete="new-password"
            v-model="form.new_password1"
            :invalid="invalid"
            :aria-describedby="describedBy"
          />
        </template>
      </FormField>

      <FormField
        field-id="editpassword-new2"
        label="Ripeti password"
        :errors="fieldErrors.new_password2"
      >
        <template #default="{ describedBy, invalid }">
          <FormInput
            id="editpassword-new2"
            type="password"
            autocomplete="new-password"
            v-model="form.new_password2"
            :invalid="invalid"
            :aria-describedby="describedBy"
          />
        </template>
      </FormField>

      <FormErrors :errors="formErrors" />

      <div>
        <ActionButton>Salva modifiche</ActionButton>
      </div>
    </form>

    <p class="mt-8 border-t border-hairline pt-6">
      <RouterLink to="/profile/edit" class="font-semibold text-sea underline"
        >← Torna al profilo</RouterLink
      >
    </p>
  </AccountColumn>
</template>
