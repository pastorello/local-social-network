<script setup lang="ts">
// The form-level box: whatever names no field of its own — a `detail`, a
// deliberately vague "e-mail o password non corretti", a pathless validation
// issue. Everything that *does* belong to a field goes through FormField
// instead, under the input that caused it (ADR-0005).
//
// One component rather than the block copied into seven forms, because
// `role="alert"` and the contrast of its colours are exactly the kind of
// detail that is right in six copies and wrong in the seventh — as it was:
// the login form announced its failure as white text on `bg-red-300`, 1.9:1.
defineProps<{ errors: string[] }>()
</script>

<template>
  <div
    v-if="errors.length > 0"
    role="alert"
    class="rounded-lg border border-status-open bg-surface p-4 text-sm text-status-open"
  >
    <p v-for="error in errors" :key="error">{{ error }}</p>
  </div>
</template>
