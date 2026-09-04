<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormErrors from '@/components/forms/FormErrors.vue'
import FormField from '@/components/forms/FormField.vue'
import FormInput from '@/components/forms/FormInput.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import { extractFieldErrors, extractFormErrors } from '@/lib/apiErrors'

const router = useRouter()
const toastStore = useToastStore()
const userStore = useUserStore()

const form = ref({
  email: userStore.user.email ?? '',
  name: userStore.user.name ?? '',
})
const fileInput = ref<HTMLInputElement | null>(null)
const errors = ref<string[]>([])
const fieldErrors = ref<Record<string, string[]>>({})

const submitForm = () => {
  errors.value = []
  fieldErrors.value = {}

  // Each of these names a field, so each is shown under that field rather
  // than in a list at the foot of the form (ADR-0005).
  if (form.value.email === '') {
    fieldErrors.value.email = ['Inserisci la tua e-mail.']
  }

  if (form.value.name === '') {
    fieldErrors.value.name = ['Inserisci il tuo nome.']
  }

  if (Object.keys(fieldErrors.value).length === 0) {
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
          avatarURL: response.data.user.avatarURL,
        })

        router.back()
      })
      .catch((error) => {
        fieldErrors.value = extractFieldErrors(error)
        errors.value = extractFormErrors(error)
      })
  }
}
</script>

<template>
  <ViewContainer class="grid-cols-2">
    <div>
      <PanelBox>
        <MainTitle>Modifica profilo</MainTitle>

        <p class="mb-6 text-muted">
          Da qui puoi editare il tuo profilo. Puoi cambiare il tuo nome, la tua e-mail e la tua
          immagine del profilo. Per cambiare la password, clicca sul link qui sotto.
        </p>

        <RouterLink to="/profile/edit/password" class="underline">Cambia password</RouterLink>
      </PanelBox>
    </div>

    <div>
      <PanelBox>
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <FormField field-id="editprofile-name" label="Nome" :errors="fieldErrors.name">
            <template #default="{ describedBy, invalid }">
              <FormInput
                id="editprofile-name"
                type="text"
                v-model="form.name"
                :invalid="invalid"
                :aria-describedby="describedBy"
                placeholder="Il tuo nome completo"
              />
            </template>
          </FormField>

          <FormField field-id="editprofile-email" label="E-mail" :errors="fieldErrors.email">
            <template #default="{ describedBy, invalid }">
              <FormInput
                id="editprofile-email"
                type="email"
                v-model="form.email"
                :invalid="invalid"
                :aria-describedby="describedBy"
                placeholder="La tua e-mail"
              />
            </template>
          </FormField>

          <FormField
            field-id="editprofile-avatar"
            label="Avatar"
            hint="JPEG, PNG o WEBP, massimo 5 MB."
            :errors="fieldErrors.avatar"
          >
            <template #default="{ describedBy, invalid }">
              <input
                id="editprofile-avatar"
                type="file"
                ref="fileInput"
                accept="image/jpeg,image/png,image/webp"
                :aria-describedby="describedBy"
                :aria-invalid="invalid || undefined"
              />
            </template>
          </FormField>

          <FormErrors :errors="errors" />

          <div>
            <ActionButton>Salva modifiche</ActionButton>
          </div>
        </form>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
