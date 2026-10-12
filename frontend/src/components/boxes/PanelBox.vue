<script setup lang="ts">
import { computed } from 'vue'

const { size } = defineProps({
  size: {
    type: String,
    default: 'medium',
    validator: (value: string) => ['small', 'medium', 'large'].includes(value),
  },
})

// computed, like ActionButton's: a plain object would read `size` once and
// never again (TD-31). Destructured props stay reactive inside computed.
const classObject = computed(() => ({
  'bg-surface border border-hairline rounded-lg h-full': true,
  'p-4': size === 'small',
  'p-8': size === 'medium',
  'p-12': size === 'large',
}))
</script>

<template>
  <div :class="classObject">
    <slot></slot>
  </div>
</template>
