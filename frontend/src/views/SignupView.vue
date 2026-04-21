<script setup>
import axios from 'axios'

import { useToastStore } from '@/stores/toast'
import { ref } from 'vue'
import { parseZodObject, SignupForm } from '@/forms/user'
import FormInput from '@/components/forms/FormInput.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'

const toastStore = useToastStore()

const form = ref({
  email: '',
  name: '',
  password1: '',
  password2: '',
})

const formErrors = ref([])

const resetForm = () => {
  form.value.email = ''
  form.value.name = ''
  form.value.password1 = ''
  form.value.password2 = ''
  formErrors.value = []
}

const submitForm = () => {
  let parsedData = parseZodObject(SignupForm, form.value)

  formErrors.value = []

  if (parsedData.errors.length > 0) {
    formErrors.value = [...parsedData.errors, ...formErrors.value]
    return
  }

  if (parsedData !== null) {
    formErrors.value = []

    axios
      .post('/api/signup/', parsedData.data)
      .then((response) => {
        if (response.data.message === 'success') {
          toastStore.showToast(
            5000,
            'The user is registered. Please activate your account by clicking your email link.',
            'bg-emerald-500',
          )

          resetForm()
          router.push('/login')
        } else {
          const data = JSON.parse(response.data.message)
          for (const key in data) {
            formErrors.value.push(data[key][0].message)
          }

          toastStore.showToast(5000, 'Something went wrong. Please try again', 'bg-red-300')
        }
      })
      .catch((error) => {
        console.log('error', error)
      })
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-2 gap-4">
    <div class="main-left">
      <PanelBox>
        <h1 class="mb-6 text-2xl">Sign up</h1>

        <p class="mb-6 text-gray-500">Join this City Party and contribute to your community!</p>

        <p class="font-bold">
          Already have an account?
          <RouterLink :to="{ name: 'login' }" class="underline">Click here</RouterLink> to log in!
        </p>
      </PanelBox>
    </div>

    <div class="main-right">
      <PanelBox>
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <div>
            <label>Name</label><br />
            <FormInput type="text" v-model="form.name" placeholder="Your full name" />
          </div>

          <div>
            <label>E-mail</label><br />
            <FormInput type="email" v-model="form.email" placeholder="Your e-mail address" />
          </div>

          <div>
            <label>Password</label><br />
            <FormInput type="password" v-model="form.password1" placeholder="Your password" />
          </div>

          <div>
            <label>Repeat password</label><br />
            <FormInput
              type="password"
              v-model="form.password2"
              placeholder="Repeat your password"
            />
          </div>

          <template v-if="formErrors.length > 0">
            <div class="bg-red-300 text-white rounded-lg p-6">
              <p v-for="error in formErrors" v-bind:key="error">{{ error }}</p>
            </div>
          </template>

          <div>
            <button class="py-4 px-6 bg-purple-600 text-white rounded-lg">Sign up</button>
          </div>
        </form>
      </PanelBox>
    </div>
  </div>
</template>
