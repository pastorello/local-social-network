<script setup lang="ts">
import { watch, ref, computed } from 'vue'
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
const isMyProfile = computed(() => route.params.id === userStore.user.id)
const profileUser = ref<User | null>(null)
const posts = ref<Post[]>([])

const getFeed = () => {
  axios
    .get(`/api/posts/profile/${route.params.id}/`)
    .then((response: { data: { posts: Post[]; user: User } }) => {
      posts.value = response.data.posts
      profileUser.value = response.data.user
    })
    .catch((error) => {
      console.log('error', error)
    })
}

const deletePost = (id: string) => {
  posts.value = posts.value.filter((post: Post) => post.id !== id)
}

const onPostCreated = (post: Post) => {
  posts.value.unshift(post)
  if (profileUser.value) {
    profileUser.value.posts_count += 1
  }
}

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
        <img
          v-if="profileUser"
          :src="profileUser.avatarURL"
          class="mt-6 mb-6 rounded-full m-auto w-50 h-50"
        />

        <p>
          <strong>{{ profileUser?.name }}</strong>
        </p>

        <div class="mt-6 flex space-x-8 justify-around" v-if="profileUser">User stats</div>

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
        <div class="bg-white border border-gray-200 rounded-lg" v-if="isMyProfile">
          <FeedForm @post-created="onPostCreated" />
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
