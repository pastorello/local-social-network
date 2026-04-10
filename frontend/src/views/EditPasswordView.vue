<script setup>
import axios from 'axios'
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'
import ActionButton from '@/components/buttons/ActionButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'

const toastStore = useToastStore()
const userStore = useUserStore()
const router = useRouter()

const form = ref({
  old_password: '',
  new_password1: '',
  new_password2: '',
})
const formErrors = ref([])

const submitForm = () => {
  formErrors.value = []

  if (form.value.new_password1 !== form.value.new_password2) {
    formErrors.value.push('The password does not match')
  }

  if (formErrors.value.length === 0) {
    let formData = new FormData()
    formData.append('old_password', form.value.old_password)
    formData.append('new_password1', form.value.new_password1)
    formData.append('new_password2', form.value.new_password2)

    axios
      .post('/api/editpassword/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        if (response.data.message === 'success') {
          toastStore.showToast(5000, 'The information was saved', 'bg-emerald-500')

          router.push(`/profile/${userStore.user.id}`)
        } else {
          const data = JSON.parse(response.data.message)

          for (const key in data) {
            formErrors.value.push(data[key][0].message)
          }
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
      <PanelBox size="large">
        <h1 class="mb-6 text-2xl">Edit password</h1>

        <p class="mb-6 text-gray-500">Here you can change your password!</p>
      </PanelBox>
    </div>

    <div class="main-right">
      <PanelBox size="large">
        <form class="space-y-6" v-on:submit.prevent="submitForm">
          <div>
            <label>Old password</label><br />
            <FormInput
              type="password"
              v-model="form.old_password"
              placeholder="Your old password"
            />
          </div>

          <div>
            <label>New password</label><br />
            <FormInput
              type="password"
              v-model="form.new_password1"
              placeholder="Your new password"
            />
          </div>

          <div>
            <label>Repeat password</label><br />
            <FormInput type="password" v-model="form.new_password2" placeholder="Repeat password" />
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
      </div>
    </div>
  </div>
</template>
