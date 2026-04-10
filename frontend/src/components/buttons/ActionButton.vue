<script setup>
const { buttonType, size } = defineProps({
  buttonType: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'danger', 'success'].includes(value),
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value),
  },
})

const classObject = {
  'rounded-lg': true,
  'bg-purple-600 text-white': buttonType === 'default',
  'bg-red-600 text-white': buttonType === 'danger',
  'bg-green-600 text-white': buttonType === 'success',
  'py-4 px-3 text-xs': size === 'small',
  'py-4 px-6 text-sm': size === 'medium',
  'py-4 px-8 text-base': size === 'large',
}
</script>

<template>
  <button :class="classObject"><slot></slot></button>
</template>
