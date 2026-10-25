import axios from 'axios'
import { computed, ref } from 'vue'

import type { ArchiveStats } from '@/definitions/interfaces/Content'
import { archiveLine } from '@/lib/archiveLine'
import { afterFirstPaint } from '@/lib/firstPaint'

// The archive's line for the home and for Il progetto (review PR-18): one
// small public answer, asked once when the page mounts. `loaded` turns true
// once it has answered, failed or not — a line that could not be checked is
// simply not printed, and the page around it is the same page. Asked for once
// the page's words are on screen, like the map's data (stores/map.ts::load):
// the home's chrome asks on every page, and an answer back before the first
// paint is one Lighthouse counts on the way to that page's largest text.
export function useArchiveLine() {
  const stats = ref<ArchiveStats | null>(null)
  const loaded = ref(false)

  const load = async () => {
    await afterFirstPaint()
    try {
      stats.value = (await axios.get<ArchiveStats>('/api/content/stats/')).data
    } catch (error) {
      console.log('error:', error)
    }
    loaded.value = true
  }

  return { line: computed(() => archiveLine(stats.value)), loaded, load }
}
