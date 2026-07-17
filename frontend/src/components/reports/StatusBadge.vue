<script setup lang="ts">
import { computed } from 'vue'

import type { ReportStatus } from '@/definitions/interfaces/Report'
import { STATUS_META } from '@/lib/reportStatus'

const props = defineProps<{
  status: ReportStatus
}>()

const meta = computed(() => STATUS_META[props.status])
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
    :style="{ backgroundColor: meta.color }"
  >
    {{ meta.label }}
  </span>
</template>
