// When something happens, in words (spec cosa-fare.md CF34, Part −1 D9): the
// one formatter for an event's or a feast's date, so that **no date is ever
// shown without its weekday**. A collaborator who meant Saturday reads
// «venerdì» and stops; a reader knows the day without a calendar.
//
// The dates are calendar days on a wall in Gaeta — `start_date` is a
// DateField, `start_time` a TimeField, never an instant (CF25) — so they are
// read as calendar days, in UTC, where no time zone can move them to the day
// before. Gaeta's zone, Europe/Rome, enters once: to know which year it is
// there, so this year's dates need not say it.
//
// In the reader's language since review PR-19a: the locale `Intl` formats the
// day with (lib/i18n::intlLocale), and the words around it — «ore», «da … a»
// — from lib/i18n/messages/when.ts. The weekday is there in both.

import { intlLocale } from '@/lib/i18n'
import words from '@/lib/i18n/messages/when'

export interface When {
  start_date: string
  start_time?: string | null
  end_date?: string | null
}

const asDay = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!))
}

const thisYearInGaeta = (): number =>
  Number(
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Rome' }).format(new Date()),
  )

// "2026-09-26" → «sabato 26 settembre» («Saturday 26 September»), with the
// year when it is not this year's in Gaeta — or always, where a mistyped year is what is being checked.
export const formatEventDay = (isoDate: string, options: { year?: boolean } = {}): string => {
  const date = asDay(isoDate)
  const withYear = options.year || date.getUTCFullYear() !== thisYearInGaeta()
  return new Intl.DateTimeFormat(intlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date)
}

// «sabato 26 settembre, ore 22:00»; «da venerdì 4 dicembre a domenica 6
// dicembre»; «da sabato 28 novembre, ore 18:00, a mercoledì 6 gennaio 2027».
// An hour on a multi-day event is when its first day begins, so it sits
// beside that day.
export const formatEventWhen = (when: When, options: { year?: boolean } = {}): string => {
  const say = words()
  const time = when.start_time ? when.start_time.slice(0, 5) : ''
  const first = formatEventDay(when.start_date, options)
  if (!when.end_date || when.end_date === when.start_date) {
    return time ? say.at(first, time) : first
  }
  const last = formatEventDay(when.end_date, options)
  return time ? say.rangeAt(first, time, last) : say.range(first, last)
}
