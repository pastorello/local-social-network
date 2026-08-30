<script setup lang="ts">
// One place that owns the label/control/error relationship, so a form cannot
// half-wire it. ADR-0005 requires the `for`/`id` pair; this adds the half that
// was deferred — `aria-describedby` to the message and `aria-invalid` on the
// control — so a screen-reader user hears *which* field was rejected instead
// of a list of sentences at the bottom of the form.
const props = defineProps<{
  fieldId: string
  label: string
  hint?: string
  errors?: string[]
}>()

const describedBy = () => {
  const ids = []
  if (props.hint) ids.push(`${props.fieldId}-hint`)
  if (props.errors?.length) ids.push(`${props.fieldId}-error`)
  return ids.length ? ids.join(' ') : undefined
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="fieldId" class="font-semibold text-ink">{{ label }}</label>
    <p v-if="hint" :id="`${fieldId}-hint`" class="text-sm text-muted">{{ hint }}</p>

    <!-- The control is a slot so the wiring works for an input, a textarea, a
    select or a whole editor without this component knowing which. -->
    <slot :described-by="describedBy()" :invalid="Boolean(errors?.length)"></slot>

    <p
      v-if="errors?.length"
      :id="`${fieldId}-error`"
      class="text-sm font-medium text-status-open"
      role="alert"
    >
      {{ errors.join(' ') }}
    </p>
  </div>
</template>
