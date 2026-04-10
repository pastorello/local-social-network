<script setup>
import axios from 'axios'

import { useUserStore } from '@/stores/user'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { LoginForm, parseZodObject } from '@/forms/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'

const userStore = useUserStore()
const router = useRouter()
const form = ref({
  email: '',
  password: '',
})

const formErrors = ref([])

const submitForm = async () => {
  let parsedData = parseZodObject(LoginForm, form.value)

  const asd = form.value

  formErrors.value = []

  if (parsedData.errors.length > 0) {
    formErrors.value = [...parsedData.errors, ...formErrors.value]
    return
  }

  if (parsedData !== null) {
    await axios
      .post('/api/login/', parsedData.data)
      .then((response) => {
        userStore.setToken(response.data)

        axios.defaults.headers.common['Authorization'] = 'Bearer ' + response.data.access
      })
      .catch((error) => {
        console.log('error', error)

        formErrors.value.push('The email or password is incorrect! Or the user is not activated!')
      })
  }

  if (formErrors.value.length === 0) {
    await axios
      .get('/api/me/')
      .then((response) => {
        userStore.setUserInfo(response.data)

        router.push('/')
      })
      .catch((error) => {
        console.log('error', error)
        formErrors.value.push('There was an error while fetching user info. Please try again!')
      })
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-2 gap-4">
    <div class="main-left">
      <PanelBox size="large">
        <h1 class="mb-6 text-2xl">Log in</h1>

        <p class="mb-6 text-gray-500">
          Welcome back! Please enter your details to log in to your account.
        </p>

        <p class="font-bold">
          Don't have an account?
          <RouterLink :to="{ name: 'signup' }" class="underline">Click here</RouterLink> to create
          one!
        </p>
      </PanelBox>
    </div>

    <div class="main-right">
      <PanelBox size="large">
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <div>
            <label>E-mail</label><br />
            <FormInput type="email" v-model="form.email" placeholder="Your e-mail address" />
          </div>

          <div>
            <label>Password</label><br />
            <FormInput type="password" v-model="form.password" placeholder="Your password" />
          </div>

          <template v-if="formErrors.length > 0">
            <div class="bg-red-300 text-white rounded-lg p-6">
              <p v-for="error in formErrors" v-bind:key="error">{{ error }}</p>
            </div>
          </template>

          <div>
            <ActionButton>Log in</ActionButton>
          </div>
        </form>
      </PanelBox>
    </div>
  </div>
</template>
