<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'

import type { Zone, ZoneAlias } from '@/definitions/interfaces/MapData'
import cosaFare from '@/lib/i18n/messages/cosaFare'
import {
  displayName,
  matchPlaces,
  placeOptions,
  placeSentence,
  type PlaceOption,
} from '@/lib/placeNames'

// «Dove sei?» (review of 2026-10-22, decision 3; spec cosa-fare.md Part −1,
// D6): the guest names where they stand and the field picks the zone. ARIA's
// combobox pattern — an input with a listbox popup and list autocomplete, the
// first match selected as one types, so Enter takes it (APG's "automatic
// selection"). One tab stop: the arrows move through the options by
// aria-activedescendant and focus never leaves the input; a live region says
// how many names match. It only chooses a zone; the page shows it.

const props = defineProps<{
  aliases: ZoneAlias[]
  zones: Pick<Zone, 'slug' | 'name' | 'name_en'>[]
  // The zone the page shows now: the line under the field speaks only while
  // it is the one chosen here, and a zone chosen some other way clears it.
  current: string | null
  // Put away, the question is: the field folds, the line under it stays. On
  // a phone a chosen zone puts the ways of choosing one away (cosa-fare.md
  // D5), and `askId` is what the control that brings them back points at.
  folded?: boolean
  askId?: string
}>()
const emit = defineEmits<{ choose: [zone: string] }>()

const id = useId()
const inputId = `${id}-input`
const labelId = `${id}-label`
const hintId = `${id}-hint`
const listId = `${id}-list`
const optionId = (index: number) => `${id}-option-${index}`

const query = ref('')
const open = ref(false)
const active = ref(-1)
const chosen = ref<PlaceOption | null>(null)
const unknown = ref(false)

const options = computed(() => placeOptions(props.aliases, props.zones))
const matches = computed(() => matchPlaces(query.value, options.value))
const shown = computed(() => (open.value ? matches.value : []))

const close = () => {
  open.value = false
  active.value = -1
}
const openAt = (index: number) => {
  if (!matches.value.length) return close()
  open.value = true
  active.value = index
}

const choose = (option: PlaceOption) => {
  chosen.value = option
  unknown.value = false
  query.value = displayName(option.name)
  close()
  emit('choose', option.zone)
}

const onInput = (event: Event) => {
  query.value = (event.target as HTMLInputElement).value
  chosen.value = null
  unknown.value = false
  if (query.value.trim()) openAt(0)
  else close()
}

const onKeydown = (event: KeyboardEvent) => {
  const count = matches.value.length
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!open.value) openAt(event.altKey ? -1 : 0)
      else if (count) active.value = (active.value + 1) % count
      return
    case 'ArrowUp':
      event.preventDefault()
      if (!open.value) openAt(count - 1)
      else if (count) active.value = active.value <= 0 ? count - 1 : active.value - 1
      return
    case 'Enter': {
      const typed = query.value.trim()
      const option =
        open.value && active.value >= 0
          ? matches.value[active.value]
          : typed
            ? matches.value[0]
            : null
      if (!option && !typed) return
      event.preventDefault()
      if (option) choose(option)
      else {
        // A name nobody listed changes nothing: the chips below stay the way in.
        close()
        unknown.value = true
      }
      return
    }
    case 'Escape':
      // The list first, then what was typed; with neither, Escape is not ours.
      if (open.value) close()
      else if (query.value) {
        query.value = ''
        chosen.value = null
        unknown.value = false
      } else return
      event.preventDefault()
      return
    case 'Tab':
      close()
  }
}

const onClick = () => (open.value ? close() : openAt(query.value.trim() ? 0 : -1))

watch(
  () => props.folded,
  (folded) => folded && close(),
)

watch(active, async (index) => {
  if (index < 0) return
  await nextTick()
  document.getElementById(optionId(index))?.scrollIntoView?.({ block: 'nearest' })
})

watch(
  () => props.current,
  (zone) => {
    unknown.value = false
    if (chosen.value && zone !== chosen.value.zone) {
      chosen.value = null
      query.value = ''
    }
  },
)

// What the field says, in the reader's language (review PR-19a).
const words = computed(() => cosaFare().where)

const outcome = computed(() => {
  if (unknown.value) return words.value.unknown
  if (chosen.value && props.current === chosen.value.zone) return placeSentence(chosen.value)
  return ''
})

const announcement = computed(() => {
  const count = matches.value.length
  if (open.value) return count === 1 ? words.value.one : words.value.many(count)
  if (query.value.trim() && !chosen.value && !unknown.value && !count) return words.value.none
  return ''
})
</script>

<template>
  <div>
    <div v-show="!folded" :id="askId">
      <label :id="labelId" :for="inputId" class="block font-semibold text-ink">{{
        words.label
      }}</label>
      <p :id="hintId" class="mt-1 text-sm text-muted">
        {{ words.hint }}
      </p>
      <div class="relative mt-2">
        <input
          :id="inputId"
          :value="query"
          type="text"
          role="combobox"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="go"
          aria-autocomplete="list"
          :aria-expanded="open"
          :aria-controls="listId"
          :aria-activedescendant="open && active >= 0 ? optionId(active) : undefined"
          :aria-describedby="hintId"
          class="w-full rounded-lg border border-field bg-surface py-3 pr-10 pl-4 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
          @input="onInput"
          @keydown="onKeydown"
          @click="onClick"
          @blur="close"
        />
        <svg
          viewBox="0 0 20 20"
          class="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5.5 8l4.5 4.5L14.5 8" />
        </svg>
        <!-- Always in the document, so aria-controls names something; its
      options exist only while it is open. -->
        <ul
          v-show="open"
          :id="listId"
          role="listbox"
          :aria-labelledby="labelId"
          class="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-field bg-surface py-1 shadow-lg"
        >
          <li
            v-for="(option, index) in shown"
            :id="optionId(index)"
            :key="option.key"
            role="option"
            :aria-selected="index === active"
            class="cursor-pointer px-4 py-2"
            :class="index === active ? 'bg-sea text-white' : 'text-ink hover:bg-page'"
            @mousedown.prevent
            @click="choose(option)"
          >
            <!-- A name as Gaeta writes it: Italian, whatever the interface's
            language (review PR-19a). -->
            <span lang="it">{{ displayName(option.name) }}</span
            ><span class="sr-only">, </span
            ><span class="text-sm" :class="index === active ? 'text-white' : 'text-muted'"
              ><span aria-hidden="true"> · </span
              >{{ option.isZone ? words.zone : option.zoneName }}</span
            >
          </li>
        </ul>
      </div>
    </div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <!-- Empty, it takes no room: folded, the field adds nothing above the
    zone's places until it has something to say. -->
    <p class="mt-2 text-ink empty:mt-0" aria-live="polite">{{ outcome }}</p>
  </div>
</template>
