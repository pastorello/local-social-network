<script setup lang="ts">
defineProps<{ html: string }>()
</script>

<template>
  <!-- The only v-html in the codebase (ADR-0001 revision). Safe only because
  `html` is always server-sanitized output (backend/content/sanitize.py),
  never raw user input — this component must never receive anything else. -->
  <div class="prose max-w-none" v-html="html"></div>
</template>
