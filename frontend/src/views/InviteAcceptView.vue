<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { parseZodObject, InviteAcceptForm } from '@/forms/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import { extractApiErrors } from '@/lib/apiErrors'

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()

const form = ref({
  password1: '',
  password2: '',
})
const formErrors = ref<string[]>([])

const submitForm = () => {
  const parsedData = parseZodObject(InviteAcceptForm, form.value)

  formErrors.value = []

  if (parsedData.errors.length > 0) {
    formErrors.value = [...parsedData.errors, ...formErrors.value]
    return
  }

  axios
    .post('/api/users/acceptinvite/', {
      ...parsedData.data,
      token: route.params.token,
    })
    .then(() => {
      toastStore.showToast(5000, 'Account attivato. Ora puoi accedere.', 'bg-emerald-500')
      router.push('/login')
    })
    .catch((error) => {
      formErrors.value = extractApiErrors(error)
    })
}
</script>

<template>
  <ViewContainer class="grid-cols-2">
    <div>
      <PanelBox>
        <MainTitle>Attiva il tuo account</MainTitle>
        <p class="text-gray-500">
          La tua richiesta di collaborazione è stata approvata. Scegli una password per completare
          l'attivazione.
        </p>
      </PanelBox>
    </div>

    <div>
      <PanelBox>
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <div>
            <label for="invite-password1">Password</label><br />
            <FormInput class="mt-2"
              id="invite-password1"
              type="password"
              v-model="form.password1"
              placeholder="La tua password"
            />
          </div>

          <div>
            <label for="invite-password2">Ripeti password</label><br />
            <FormInput class="mt-2"
              id="invite-password2"
              type="password"
              v-model="form.password2"
              placeholder="Ripeti la password"
            />
          </div>

          <template v-if="formErrors.length > 0">
            <div class="bg-red-50 text-red-800 rounded-lg p-6">
              <p v-for="error in formErrors" v-bind:key="error">{{ error }}</p>
            </div>
          </template>

          <div>
            <ActionButton>Attiva account</ActionButton>
          </div>
        </form>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
