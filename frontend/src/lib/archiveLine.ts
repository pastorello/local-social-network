import type { ArchiveStats } from '@/definitions/interfaces/Content'
import { formatDay } from '@/lib/availability'
import archive from '@/lib/i18n/messages/archive'

// The archive's line (review PR-18, content.md): «127 schede, l'ultima
// aggiornata il 3 marzo 2026» — that the archive is alive, said once for the
// whole of it and never on a card. Nothing at all while it is empty: «0
// schede» is an apology, not a sign of life.
//
// The day is Gaeta's, decided by the API as a place's hours are dated
// (`today_in_gaeta`), and printed with the formatter that prints those hours —
// a calendar day, which no time zone may move to the day before. In the
// reader's language (review PR-19a): «22 entries, the latest updated on 24
// October 2026».
export const archiveLine = (stats: ArchiveStats | null | undefined): string | null => {
  if (typeof stats?.published !== 'number' || stats.published < 1) return null

  const words = archive()
  if (!stats.last_updated) return words.entries(stats.published)

  const day = formatDay(stats.last_updated)
  return stats.published === 1 ? words.one(day) : words.many(stats.published, day)
}
