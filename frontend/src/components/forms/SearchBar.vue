<script setup lang="ts">
import { ref, watch } from 'vue'
import ActionButton from '@/components/buttons/ActionButton.vue'

// Definisco le props con tipizzazione
interface Props {
  modelValue: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Ricerca...',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'submit'): void
}>()

const localQuery = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newValue) => {
    localQuery.value = newValue
  },
)

const handleSubmit = (e: Event) => {
  e.preventDefault()
  emit('update:modelValue', localQuery.value)
  emit('submit')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="pb-6 flex space-x-4">
    <input
      v-model="localQuery"
      type="search"
      class="p-4 w-full bg-gray-100 rounded-lg"
      :placeholder="props.placeholder"
    />
    <ActionButton class="inline-block">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    </ActionButton>
  </form>
</template>
