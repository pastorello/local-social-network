<script setup lang="ts">
import { nextTick, ref } from 'vue'

// The authoring form's sections as tabs at the head of the panel (spec/
// design.md D19): a 560px panel beside the map would turn the long stack of
// sections into an endless scroll. ARIA's tabs pattern, whole: the tabs are one
// stop in the tab order, arrows move between them, Home and End jump to the
// ends. The panels are the form's own sections, kept in the DOM while hidden
// (v-show), so every field keeps its id and its error wiring.
export interface FormTab {
  key: string
  label: string
  // A field in this section was rejected: the tab says so, since the field
  // itself may be out of sight.
  hasError?: boolean
}

const props = defineProps<{ tabs: FormTab[]; idPrefix: string }>()
const active = defineModel<string>({ required: true })

const buttons = ref<HTMLButtonElement[]>([])

const select = async (index: number) => {
  const tab = props.tabs[index]
  if (!tab) return
  active.value = tab.key
  await nextTick()
  buttons.value[index]?.focus()
}

const onKeydown = (event: KeyboardEvent, index: number) => {
  const last = props.tabs.length - 1
  const target =
    event.key === 'ArrowRight'
      ? (index + 1) % props.tabs.length
      : event.key === 'ArrowLeft'
        ? (index - 1 + props.tabs.length) % props.tabs.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : null
  if (target === null) return
  event.preventDefault()
  select(target)
}
</script>

<template>
  <div role="tablist" aria-label="Sezioni della scheda" class="flex flex-wrap gap-1">
    <button
      v-for="(tab, index) in tabs"
      :id="`${idPrefix}-tab-${tab.key}`"
      :key="tab.key"
      ref="buttons"
      type="button"
      role="tab"
      :aria-selected="active === tab.key"
      :aria-controls="`${idPrefix}-panel-${tab.key}`"
      :tabindex="active === tab.key ? 0 : -1"
      class="flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      :class="active === tab.key ? 'bg-sea/10 text-sea' : 'text-ink hover:bg-page'"
      @click="select(index)"
      @keydown="onKeydown($event, index)"
    >
      {{ tab.label }}
      <template v-if="tab.hasError">
        <span class="h-2 w-2 rounded-full bg-status-open" aria-hidden="true"></span>
        <span class="sr-only">(contiene un errore)</span>
      </template>
    </button>
  </div>
</template>
