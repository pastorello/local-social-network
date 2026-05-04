<script setup lang="ts">
import type Comment from '@/definitions/interfaces/Comment'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  comment: Comment
}>()
</script>

<template>
  <div class="mb-6 flex items-center justify-between">
    <div class="flex items-center space-x-6">
      <img :src="comment.created_by.avatarURL" class="w-10 rounded-full" />

      <p>
        <strong>
          <RouterLink :to="{ name: 'profile', params: { id: comment.created_by.id } }">{{
            comment.created_by.name
          }}</RouterLink>
        </strong>
      </p>
    </div>

    <p class="text-gray-600">{{ comment.created_at_formatted }} ago</p>
  </div>

  <p>{{ comment.body }}</p>
</template>
