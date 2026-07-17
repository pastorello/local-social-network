<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import type Post from '@/definitions/interfaces/Post'
import FeedForm from '@/components/forms/FeedForm.vue'
import FeedItem from '@/components/cards/FeedItem.vue'

const posts = ref<Post[]>([])

const getFeed = async () => {
  await axios
    .get('/api/posts/list/')
    .then((response) => {
      posts.value = response.data
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
}

onMounted(() => {
  getFeed()
})
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="main-left col-span-1">
      <PanelBox class="text-center">LEFT COLUMN</PanelBox>
    </div>

    <div class="main-center col-span-2 space-y-4">
      <PanelBox>
        <MainTitle>Posts list</MainTitle>
        <div class="bg-white border border-gray-200 rounded-lg mb-8">
          <FeedForm @post-created="onPostCreated" />
        </div>

        <div
          class="p-4 bg-white border border-gray-200 rounded-lg mb-8"
          v-for="post in posts"
          v-bind:key="post.id"
        >
          <FeedItem v-bind:post="post" v-on:deletePost="deletePost" />
        </div>
      </PanelBox>
    </div>

    <div class="main-right col-span-1 space-y-4">
      <PanelBox class="text-center">RIGHT COLUMN</PanelBox>
    </div>
  </ViewContainer>
</template>
