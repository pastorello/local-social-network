<script setup lang="ts">
// Session restore and the Authorization header both moved to main.ts and
// lib/auth.ts (TD-32) — this component only composes the shell now.
import AppToast from '@/components/modals/AppToast.vue'
import AppHeader from './components/AppHeader.vue'
</script>

<template>
  <AppHeader />

  <main
    class="h-screen overflow-auto bg-gray-100 px-4 py-4 pt-[calc(var(--header-h,10rem)+1rem)] lg:px-8 lg:py-6 lg:pt-[calc(var(--header-h,10rem)+1.5rem)]"
  >
    <RouterView />
  </main>

  <AppToast />
</template>
