<script setup lang="ts">
import axios from 'axios'
import { useRoute } from 'vue-router'
import { onMounted, ref } from 'vue'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import FeedItem from '@/components/cards/FeedItem.vue'
import CommentItem from '@/components/cards/CommentItem.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import type Post from '@/definitions/interfaces/Post'

const post = ref<Post | null>(null)

const body = ref<string>('')
const route = useRoute()

const getPost = () => {
  axios
    .get(`/api/posts/${route.params.id}/`)
    .then((response) => {
      post.value = response.data.post
    })
    .catch((error) => {
      console.log('error', error)
    })
}

const submitForm = () => {
  axios
    .post(`/api/posts/${route.params.id}/comment/`, {
      body: body.value,
    })
    .then((response) => {
      if (post.value) {
        post.value.comments.push(response.data)
        post.value.comments_count += 1
      }
      body.value = ''
    })
    .catch((error) => {
      console.log('error', error)
    })
}

onMounted(() => {
  getPost()
})
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="main-left col-span-1">
      <PanelBox class="text-center">LEFT COLUMN</PanelBox>
    </div>

    <div class="main-center col-span-2 space-y-4">
      <PanelBox>
        <MainTitle>Post</MainTitle>
        <template v-if="post">
          <div class="p-4 bg-white border border-gray-200 rounded-lg mb-8">
            <FeedItem v-bind:post="post" />
          </div>

          <div
            class="p-4 ml-6 bg-white border border-gray-200 rounded-lg mb-8"
            v-for="comment in post.comments"
            v-bind:key="comment.id"
          >
            <CommentItem v-bind:comment="comment" />
          </div>
        </template>

        <div class="bg-white border border-gray-200 rounded-lg">
          <form v-on:submit.prevent="submitForm" method="post">
            <div class="p-4">
              <textarea
                v-model="body"
                class="p-4 w-full bg-gray-100 rounded-lg"
                placeholder="What do you think?"
              ></textarea>
            </div>

            <div class="p-4 border-t border-gray-100">
              <ActionButton> Comment </ActionButton>
            </div>
          </form>
        </div>
      </PanelBox>
    </div>

    <div class="main-right col-span-1 space-y-4">
      <PanelBox class="text-center">RIGHT COLUMN</PanelBox>
    </div>
  </ViewContainer>
</template>
