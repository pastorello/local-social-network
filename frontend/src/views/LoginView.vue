<script setup lang="ts">
import axios from 'axios'

import { useUserStore } from '@/stores/user'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { LoginForm, parseZodObject } from '@/forms/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormErrors from '@/components/forms/FormErrors.vue'
import FormField from '@/components/forms/FormField.vue'
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
const fieldErrors = ref<Record<string, string[]>>({})

const submitForm = async () => {
  const parsedData = parseZodObject(LoginForm, form.value)

  formErrors.value = []
  fieldErrors.value = parsedData.fieldErrors

  if (parsedData.errors.length > 0 || Object.keys(parsedData.fieldErrors).length > 0) {
    formErrors.value = parsedData.errors
    return
  }

  await axios
    .post('/api/users/login/', parsedData.data)
    .then((response) => {
      userStore.setToken(response.data)
    })
    .catch((error) => {
      console.log('error', error)

      // Deliberately form-level and deliberately vague: saying *which* of the
      // two was wrong would tell a stranger whether an address has an account
      // here — the same reasoning that makes a reset request always answer 200.
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
    <div>
      <PanelBox>
        <MainTitle>Accedi</MainTitle>

        <p class="mb-6 text-muted">
          Bentornato! Inserisci i tuoi dati per accedere al tuo account.
        </p>

        <p class="font-bold">
          Vuoi collaborare?
          <RouterLink :to="{ name: 'collabora' }" class="underline">Scrivici</RouterLink>!
        </p>
      </PanelBox>
    </div>

    <div>
      <PanelBox>
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <FormField field-id="login-email" label="E-mail" :errors="fieldErrors.email">
            <template #default="{ describedBy, invalid }">
              <FormInput
                id="login-email"
                type="email"
                v-model="form.email"
                :invalid="invalid"
                :aria-describedby="describedBy"
                placeholder="La tua e-mail"
              />
            </template>
          </FormField>

          <FormField field-id="login-password" label="Password" :errors="fieldErrors.password">
            <template #default="{ describedBy, invalid }">
              <FormInput
                id="login-password"
                type="password"
                v-model="form.password"
                :invalid="invalid"
                :aria-describedby="describedBy"
                placeholder="La tua password"
              />
            </template>
          </FormField>

          <!-- In a block of its own: the form spaces its children with
          `space-y-6`, which sets a top margin — and a margin-top does nothing
          to an inline <a>. -->
          <div>
            <RouterLink :to="{ name: 'passwordresetrequest' }" class="text-sm text-sea underline">
              Password dimenticata?
            </RouterLink>
          </div>

          <FormErrors :errors="formErrors" />

          <div>
            <ActionButton>Accedi</ActionButton>
          </div>
        </form>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
