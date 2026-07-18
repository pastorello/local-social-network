<script setup lang="ts">
import axios from 'axios'

import { useUserStore } from '@/stores/user'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { LoginForm, parseZodObject } from '@/forms/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const form = ref({
  email: '',
  password: '',
})

const formErrors = ref<string[]>([])

const submitForm = async () => {
  const parsedData = parseZodObject(LoginForm, form.value)

  formErrors.value = []

  if (parsedData.errors.length > 0) {
    formErrors.value = [...parsedData.errors, ...formErrors.value]
    return
  }

  await axios
    .post('/api/users/login/', parsedData.data)
    .then((response) => {
      userStore.setToken(response.data)

      axios.defaults.headers.common['Authorization'] = 'Bearer ' + response.data.access
    })
    .catch((error) => {
      console.log('error', error)

      formErrors.value.push('E-mail o password non corretti.')
    })

  if (formErrors.value.length === 0) {
    await axios
      .get('/api/users/me/')
      .then((response) => {
        userStore.setUserInfo(response.data)

        // back to where the router guard intercepted the visitor, if anywhere
        const redirect = route.query.redirect
        router.push(typeof redirect === 'string' ? redirect : '/')
      })
      .catch((error) => {
        console.log('error', error)
        formErrors.value.push('Errore nel caricamento del profilo. Riprova.')
      })
  }
}
</script>

<template>
  <ViewContainer class="grid-cols-2">
    <div class="main-left">
      <PanelBox>
        <MainTitle>Accedi</MainTitle>

        <p class="mb-6 text-gray-500">
          Bentornato! Inserisci i tuoi dati per accedere al tuo account.
        </p>

        <p class="font-bold">
          Non hai un account?
          <RouterLink :to="{ name: 'signup' }" class="underline">Registrati qui</RouterLink>!
        </p>
      </PanelBox>
    </div>

    <div class="main-right">
      <PanelBox>
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <div>
            <label>E-mail</label><br />
            <FormInput type="email" v-model="form.email" placeholder="La tua e-mail" />
          </div>

          <div>
            <label>Password</label><br />
            <FormInput type="password" v-model="form.password" placeholder="La tua password" />
          </div>

          <template v-if="formErrors.length > 0">
            <div class="bg-red-300 text-white rounded-lg p-6">
              <p v-for="error in formErrors" v-bind:key="error">{{ error }}</p>
            </div>
          </template>

          <div>
            <ActionButton>Accedi</ActionButton>
          </div>
        </form>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
