<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'

import { useToastStore } from '@/stores/toast'
import { parseZodObject, PasswordResetRequestForm } from '@/forms/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormErrors from '@/components/forms/FormErrors.vue'
import FormField from '@/components/forms/FormField.vue'
import FormInput from '@/components/forms/FormInput.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'

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
  <ViewContainer class="grid-cols-2">
    <div>
      <PanelBox>
        <MainTitle>Password dimenticata</MainTitle>
        <p class="text-muted">
          Inserisci la tua e-mail: se corrisponde a un account, riceverai un link per reimpostare la
          password.
        </p>
      </PanelBox>
    </div>

    <div>
      <PanelBox>
        <template v-if="sent">
          <p>Se l'indirizzo esiste, riceverai un'e-mail a breve.</p>
        </template>
        <form v-else class="space-y-6" v-on:submit.prevent="submitForm">
          <FormField field-id="reset-request-email" label="E-mail" :errors="fieldErrors.email">
            <template #default="{ describedBy, invalid }">
              <FormInput
                id="reset-request-email"
                type="email"
                v-model="form.email"
                :invalid="invalid"
                :aria-describedby="describedBy"
                placeholder="La tua e-mail"
              />
            </template>
          </FormField>

          <FormErrors :errors="formErrors" />

          <div>
            <ActionButton>Invia link</ActionButton>
          </div>
        </form>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
