import { defineMessages } from '..'

// The words around an event's or a feast's date (lib/when.ts, CF34) in the
// reader's language (review PR-19a): the day itself is `Intl`'s, in the
// reader's locale, with its weekday. With the pages that print a date.
export default defineMessages({
  it: {
    // «sabato 26 settembre, ore 22:00»
    at: (day: string, time: string) => `${day}, ore ${time}`,
    // «da venerdì 4 dicembre a domenica 6 dicembre»
    range: (first: string, last: string) => `da ${first} a ${last}`,
    // «da sabato 28 novembre, ore 18:00, a mercoledì 6 gennaio 2027»
    rangeAt: (first: string, time: string, last: string) => `da ${first}, ore ${time}, a ${last}`,
  },
  en: {
    at: (day: string, time: string) => `${day} at ${time}`,
    range: (first: string, last: string) => `from ${first} to ${last}`,
    rangeAt: (first: string, time: string, last: string) => `from ${first} at ${time} to ${last}`,
  },
})
