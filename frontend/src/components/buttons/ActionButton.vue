<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

// `to` renders the same thing as a link. Not a convenience: the two list
// views used to wrap this button in a `RouterLink`, which is a `<button>`
// inside an `<a>` — two tab stops for one control, and two different
// announcements of it. One element, and the caller says which it is.
const { buttonType = 'default', size = 'medium' } = defineProps<{
  buttonType?: 'default' | 'danger' | 'success'
  size?: 'small' | 'medium' | 'large'
  to?: RouteLocationRaw
}>()

const classObject = computed(() => ({
  'rounded-lg cursor-pointer': true,
  'bg-sea text-white': buttonType === 'default',
  'bg-red-600 text-white': buttonType === 'danger',
  // green-600 measures ~3.3:1 against white text, short of WCAG AA's 4.5:1 (ADR-0005)
  'bg-green-700 text-white': buttonType === 'success',
  'py-4 px-3 text-xs': size === 'small',
  'py-4 px-6 text-sm': size === 'medium',
  'py-4 px-8 text-base': size === 'large',
}))
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="[classObject, 'inline-block text-center']">
    <slot></slot>
  </RouterLink>
  <button v-else :class="classObject"><slot></slot></button>
</template>
