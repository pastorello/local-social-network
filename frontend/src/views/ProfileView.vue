<script setup lang="ts">
import { watch, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

import { useUserStore } from '@/stores/user'
import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import FeedItem from '@/components/cards/FeedItem.vue'
import type Post from '@/definitions/interfaces/Post'
import type User from '@/definitions/interfaces/User'
import FeedForm from '@/components/forms/FeedForm.vue'

const userStore = useUserStore()
const route = useRoute()
const user = userStore.user
const isMyProfile = route.params.id === user.id
const posts = ref<Post[]>([])

const getFeed = () => {
  axios
    .get(`/api/posts/profile/${route.params.id}/`)
    .then((response: { data: { posts: Post[]; user: User } }) => {
      console.log('data', response.data)

      posts.value = response.data.posts
      user.value = response.data.user
    })
    .catch((error) => {
      console.log('error', error)
    })
}

const deletePost = (id: string) => {
  posts.value = posts.value.filter((post: Post) => post.id !== id)
}

onMounted(() => {
  getFeed()
})

watch(
  () => route.params.id,
  () => {
    getFeed()
  },
  { immediate: true },
)
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="main-left col-span-1">
      <PanelBox class="text-center">
        <img :src="user.avatar" class="mt-6 mb-6 rounded-full m-auto w-50 h-50" />

        <p>
          <strong>{{ user.name }}</strong>
        </p>

        <div class="mt-6 flex space-x-8 justify-around" v-if="user.id">User stats</div>

        <div class="mt-6">
          <RouterLink
            class="inline-block mr-2 py-4 px-3 bg-purple-600 text-xs text-white rounded-lg"
            to="/profile/edit"
            v-if="isMyProfile"
          >
            Edit profile
          </RouterLink>
        </div>
      </PanelBox>
    </div>

    <div class="main-center col-span-2 space-y-4">
      <PanelBox>
        <div
          class="bg-white border border-gray-200 rounded-lg"
          v-if="userStore.user.id === user.id"
        >
          <FeedForm v-bind:user="user" v-bind:posts="posts" />
        </div>

        <div
          class="p-4 bg-white border border-gray-200 rounded-lg"
          v-for="post in posts"
          v-bind:key="post.id"
        >
          <FeedItem v-bind:post="post" v-on:deletePost="deletePost" />
        </div>
      </PanelBox>
    </div>

    <div class="main-right col-span-1 space-y-4">
      <PanelBox class="text-center">MAIN RIGHT COLUMN</PanelBox>
    </div>
  </ViewContainer>
</template>
