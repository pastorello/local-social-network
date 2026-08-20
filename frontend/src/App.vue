<script setup lang="ts">
// Session restore and the Authorization header both moved to main.ts and
// lib/auth.ts (TD-32) — this component only composes the shell now.
import AppToast from '@/components/modals/AppToast.vue'
import AppHeader from './components/AppHeader.vue'
</script>

<template>
  <AppHeader />

  <main class="px-8 py-6 bg-gray-100 h-screen overflow-auto pt-40">
    <RouterView />
  </main>

  <AppToast />
</template>
