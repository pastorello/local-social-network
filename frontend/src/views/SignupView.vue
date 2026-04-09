<script setup>
import axios from 'axios'

import { useToastStore } from '@/stores/toast'
import { ref } from 'vue'
import * as z from 'zod'
import { it } from 'zod/locales'

z.config(it())

const SignupForm = z.object({
  email: z.email(),
  name: z.string().min(2).max(200),
  password1: z.string().min(8),
  password2: z.string().min(8),
})

const toastStore = useToastStore()

const form = ref({
  email: '',
  name: '',
  password1: '',
  password2: '',
})

const formErrors = ref([])

const submitForm = () => {
  let parsedData = null

  try {
    parsedData = SignupForm.parse(form.value)
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        formErrors.value.push(`${issue.path.join(', ')} ${issue.message}`)
      })
    }
  }

  if (parsedData !== null) {
    formErrors.value = []

    axios
      .post('/api/signup/', parsedData)
      .then((response) => {
        if (response.data.message === 'success') {
          toastStore.showToast(
            5000,
            'The user is registered. Please activate your account by clicking your email link.',
            'bg-emerald-500',
          )

          form.value.email = ''
          form.value.name = ''
          form.value.password1 = ''
          form.value.password2 = ''
          formErrors.value = []

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
      <div class="p-12 bg-white border border-gray-200 rounded-lg">
        <h1 class="mb-6 text-2xl">Sign up</h1>

        <p class="mb-6 text-gray-500">Join this City Party and contribute to your community!</p>

        <p class="font-bold">
          Already have an account?
          <RouterLink :to="{ name: 'login' }" class="underline">Click here</RouterLink> to log in!
        </p>
      </div>
    </div>

    <div class="main-right">
      <div class="p-12 bg-white border border-gray-200 rounded-lg">
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <div>
            <label>Name</label><br />
            <input
              type="text"
              v-model="form.name"
              placeholder="Your full name"
              class="w-full mt-2 py-4 px-6 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label>E-mail</label><br />
            <input
              type="email"
              v-model="form.email"
              placeholder="Your e-mail address"
              class="w-full mt-2 py-4 px-6 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label>Password</label><br />
            <input
              type="password"
              v-model="form.password1"
              placeholder="Your password"
              class="w-full mt-2 py-4 px-6 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label>Repeat password</label><br />
            <input
              type="password"
              v-model="form.password2"
              placeholder="Repeat your password"
              class="w-full mt-2 py-4 px-6 border border-gray-200 rounded-lg"
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
      </div>
    </div>
  </div>
</template>
