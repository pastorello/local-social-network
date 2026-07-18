<script setup lang="ts">
import axios from 'axios'

import { useToastStore } from '@/stores/toast'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { parseZodObject, SignupForm } from '@/forms/user'
import FormInput from '@/components/forms/FormInput.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'

const toastStore = useToastStore()
const router = useRouter()

const form = ref({
  email: '',
  name: '',
  password1: '',
  password2: '',
})

const formErrors = ref<string[]>([])

const resetForm = () => {
  form.value.email = ''
  form.value.name = ''
  form.value.password1 = ''
  form.value.password2 = ''
  formErrors.value = []
}

const submitForm = () => {
  const parsedData = parseZodObject(SignupForm, form.value)

  formErrors.value = []

  if (parsedData.errors.length > 0) {
    formErrors.value = [...parsedData.errors, ...formErrors.value]
    return
  }

  axios
    .post('/api/users/signup/', parsedData.data)
    .then(() => {
      toastStore.showToast(5000, 'Account creato! Ora puoi accedere.', 'bg-emerald-500')

      resetForm()
      router.push('/login')
    })
    .catch((error) => {
      const fields = error.response?.data?.fields as Record<string, string[]> | undefined
      formErrors.value = fields
        ? Object.values(fields).flat()
        : ['Si è verificato un errore. Riprova.']

      toastStore.showToast(5000, 'Qualcosa è andato storto. Riprova.', 'bg-red-300')
    })
}
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-2 gap-4">
    <div class="main-left">
      <PanelBox>
        <MainTitle>Registrati</MainTitle>

        <p class="mb-6 text-gray-500">
          Unisciti a Gaeta Partecipa e contribuisci a migliorare la tua città!
        </p>

        <p class="font-bold">
          Hai già un account?
          <RouterLink :to="{ name: 'login' }" class="underline">Accedi qui</RouterLink>!
        </p>
      </PanelBox>
    </div>

    <div class="main-right">
      <PanelBox>
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <div>
            <label>Nome</label><br />
            <FormInput type="text" v-model="form.name" placeholder="Il tuo nome completo" />
          </div>

          <div>
            <label>E-mail</label><br />
            <FormInput type="email" v-model="form.email" placeholder="La tua e-mail" />
          </div>

          <div>
            <label>Password</label><br />
            <FormInput type="password" v-model="form.password1" placeholder="La tua password" />
          </div>

          <div>
            <label>Ripeti password</label><br />
            <FormInput
              type="password"
              v-model="form.password2"
              placeholder="Ripeti la password"
            />
          </div>

          <template v-if="formErrors.length > 0">
            <div class="bg-red-300 text-white rounded-lg p-6">
              <p v-for="error in formErrors" v-bind:key="error">{{ error }}</p>
            </div>
          </template>

          <div>
            <ActionButton>Registrati</ActionButton>
          </div>
        </form>
      </PanelBox>
    </div>
  </div>
</template>
