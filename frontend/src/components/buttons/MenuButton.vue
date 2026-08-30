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
      'flex w-auto items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm lg:grid lg:w-26 lg:place-items-center lg:gap-0 lg:p-4 lg:text-base',
      { 'text-sea border border-sea shadow-md': route.path === to },
    ]"
  >
    <span class="lg:mb-1">
      <slot name="icon"></slot>
    </span>
    <span>
      <slot></slot>
    </span>
  </RouterLink>
</template>
