<script setup lang="ts">
import type Poll from '@/definitions/interfaces/Poll'

defineProps<{
  question: Poll
}>()
</script>

<template>
  <div class="w-full mx-auto overflow-hidden bg-white rounded-lg shadow-md">
    <div class="px-6 py-4">
      <h2 class="text-xl font-bold text-gray-800">{{ question.question_text }}</h2>
      <p class="text-gray-600">Pubblicata {{ question.created_at_formatted }} fa</p>
    </div>
  </div>
</template>
