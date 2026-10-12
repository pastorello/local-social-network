<script setup lang="ts">
import { computed } from 'vue'

import { initials as initialsOf } from '@/lib/initials'

const props = defineProps<{ src: string | null; name: string | null }>()

const label = computed(() => `Foto profilo di ${props.name ?? 'utente'}`)

// Rendered when there is no uploaded avatar. The old placeholder was a
// third-party random image, so the same person had a different face on every
// reload (TD-30).
const initials = computed(() => initialsOf(props.name))
</script>

<template>
  <img v-if="src" :src="src" :alt="label" />
  <div
    v-else
    role="img"
    :aria-label="label"
    class="flex items-center justify-center bg-gray-200 text-gray-600 font-semibold select-none"
  >
    {{ initials || '?' }}
  </div>
</template>
