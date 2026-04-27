<script setup lang="ts">
import { useFileUpload } from '@/composables/useFileUpload'
import type Post from '@/definitions/interfaces/Post'
import type User from '@/definitions/interfaces/User'
import axios from 'axios'
import { ref } from 'vue'

const props = defineProps<{
  user: User
  posts: Post[]
}>()

const body = ref<string>('')
const is_private = ref<boolean>(false)
const { url, fileInput, onFileChange, resetFile } = useFileUpload()

const submitForm = async () => {
  try {
    const formData = new FormData()
    if (fileInput.value?.files?.[0]) {
      formData.append('image', fileInput.value.files[0])
    }
    formData.append('body', body.value)
    formData.append('is_private', is_private.value.toString())

    const response = await axios.post('/api/posts/create/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    props.posts.unshift(response.data)
    if (props.user) {
      props.user.posts_count += 1
    }

    body.value = ''
    is_private.value = false
    resetFile()
  } catch (error) {
    console.error('Errore durante il caricamento:', error)
  }
}
</script>

<template>
  <form @submit.prevent="submitForm" method="post">
    <div class="p-4">
      <textarea
        v-model="body"
        class="p-4 w-full bg-gray-100 rounded-lg"
        placeholder="A cosa stai pensando?"
      ></textarea>

      <label>
        <input type="checkbox" v-model="is_private" />
        Private
      </label>

      <div id="preview" v-if="url">
        <img :src="url" class="w-25 mt-3 rounded-xl" />
      </div>
    </div>

    <div class="p-4 border-t border-gray-100 flex justify-between">
      <label class="inline-block py-4 px-6 bg-gray-600 text-white rounded-lg">
        <input type="file" ref="fileInput" @change="onFileChange" accept="image/*" />
        Attach image
      </label>

      <button type="submit" class="inline-block py-4 px-6 bg-purple-600 text-white rounded-lg">
        Post
      </button>
    </div>
  </form>
</template>
