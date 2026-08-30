<script setup lang="ts">
const { size } = defineProps({
  size: {
    type: String,
    default: 'medium',
    validator: (value: string) => ['small', 'medium', 'large'].includes(value),
  },
})

const classObject = {
  'bg-surface border border-hairline rounded-lg h-full': true,
  'p-4': size === 'small',
  'p-8': size === 'medium',
  'p-12': size === 'large',
}
</script>

<template>
  <div :class="classObject">
    <slot></slot>
  </div>
</template>
