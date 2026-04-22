<script setup lang="ts">
/**
 * Props:
 * - to: string (required) - Il percorso per il RouterLink.
 * Slots:
 * - default: Contenuto del pulsante.
 * - icon: Contenuto opzionale per l'icona del pulsante.
 */

import { useRoute, RouterLink } from 'vue-router'
const route = useRoute()

const { to } = defineProps<{
  to: string
}>()
</script>

<template>
  <RouterLink
    :to="to"
    :class="[
      'w-26 rounded-lg p-4 bg-gray-200 grid place-items-center',
      { 'text-purple-700 border border-purple-700 shadow-md': route.path === to },
    ]"
  >
    <span class="mb-1">
      <slot name="icon"></slot>
    </span>
    <span>
      <slot></slot>
    </span>
  </RouterLink>
</template>
