<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'

const router = useRouter()
const toastStore = useToastStore()
const userStore = useUserStore()

const form = ref({
  email: userStore.user.email ?? '',
  name: userStore.user.name ?? '',
})
const fileInput = ref<HTMLInputElement | null>(null)
const errors = ref<string[]>([])

const submitForm = () => {
  errors.value = []

  if (form.value.email === '') {
    errors.value.push('Your e-mail is missing')
  }

  if (form.value.name === '') {
    errors.value.push('Your name is missing')
  }

  if (errors.value.length === 0) {
    const formData = new FormData()
    const avatarFile = fileInput.value?.files?.[0]
    if (avatarFile) {
      formData.append('avatar', avatarFile)
    }
    formData.append('name', form.value.name)
    formData.append('email', form.value.email)

    axios
      .post('/api/users/editprofile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        toastStore.showToast(5000, 'Le informazioni sono state salvate', 'bg-emerald-500')

        userStore.setUserInfo({
          id: userStore.user.id ?? '',
          name: form.value.name,
          email: form.value.email,
          role: userStore.user.role ?? 'citizen',
          avatar: response.data.user.avatarURL,
        })

        router.back()
      })
      .catch((error) => {
        const fields = error.response?.data?.fields as Record<string, string[]> | undefined
        errors.value = fields
          ? Object.values(fields).flat()
          : ['Si è verificato un errore. Riprova.']
      })
  }
}
</script>

<template>
  <ViewContainer class="grid-cols-2">
    <div class="main-left">
      <PanelBox>
        <MainTitle>Edit profile</MainTitle>

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
            <FormInput type="text" v-model="form.name" placeholder="Your full name" />
          </div>

          <div>
            <label>E-mail</label><br />
            <FormInput type="email" v-model="form.email" placeholder="Your e-mail address" />
          </div>

          <div>
            <label>Avatar</label><br />
            <input type="file" ref="fileInput" accept="image/*" />
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
  </ViewContainer>
</template>
