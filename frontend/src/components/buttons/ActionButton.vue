<script setup lang="ts">
import { computed } from 'vue'

const { buttonType = 'default', size = 'medium' } = defineProps<{
  buttonType?: 'default' | 'danger' | 'success'
  size?: 'small' | 'medium' | 'large'
}>()

const classObject = computed(() => ({
  'rounded-lg cursor-pointer': true,
  'bg-purple-600 text-white': buttonType === 'default',
  'bg-red-600 text-white': buttonType === 'danger',
  'bg-green-600 text-white': buttonType === 'success',
  'py-4 px-3 text-xs': size === 'small',
  'py-4 px-6 text-sm': size === 'medium',
  'py-4 px-8 text-base': size === 'large',
}))
</script>

<template>
  <button :class="classObject"><slot></slot></button>
</template>
