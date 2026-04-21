<script setup>
import axios from 'axios'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'

const router = useRouter()
const toastStore = useToastStore()
const userStore = useUserStore()

const formData = ref({
  email: userStore.user.email,
  name: userStore.user.name,
})
const errors = ref([])

const submitForm = () => {
  errors.value = []

  if (formData.value.email === '') {
    errors.value.push('Your e-mail is missing')
  }

  if (formData.value.name === '') {
    errors.value.push('Your name is missing')
  }

  if (errors.value.length === 0) {
    let formData = new FormData()
    formData.append('avatar', $refs.file.files[0])
    formData.append('name', formData.value.name)
    formData.append('email', formData.value.email)

    axios
      .post('/api/editprofile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        if (response.data.message === 'information updated') {
          toastStore.showToast(5000, 'The information was saved', 'bg-emerald-500')

          userStore.setUserInfo({
            id: userStore.user.id,
            name: formData.value.name,
            email: formData.value.email,
            avatar: response.data.user.get_avatar,
          })

          router.back()
        } else {
          toastStore.showToast(5000, `${response.data.message}. Please try again`, 'bg-red-300')
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
        <h1 class="mb-6 text-2xl">Edit profile</h1>

        <p class="mb-6 text-gray-500">
          Da qui puoi editare il tuo profilo. Puoi cambiare il tuo nome, la tua e-mail e la tua
          immagine del profilo. Per cambiare la password, clicca sul link qui sotto.
        </p>

        <RouterLink to="/profile/edit/password" class="underline">Edit password</RouterLink>
      </PanelBox>
    </div>

    <div class="main-right">
      <PanelBox>
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <div>
            <label>Name</label><br />
            <FormInput type="text" v-model="formData.name" placeholder="Your full name" />
          </div>

          <div>
            <label>E-mail</label><br />
            <FormInput type="email" v-model="formData.email" placeholder="Your e-mail address" />
          </div>

          <div>
            <label>Avatar</label><br />
            <input type="file" ref="file" />
          </div>

          <template v-if="errors.length > 0">
            <div class="bg-red-300 text-white rounded-lg p-6">
              <p v-for="error in errors" v-bind:key="error">{{ error }}</p>
            </div>
          </template>

          <div>
            <ActionButton>Save changes</ActionButton>
          </div>
        </form>
      </PanelBox>
    </div>
  </div>
</template>
