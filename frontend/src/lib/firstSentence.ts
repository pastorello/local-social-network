// The first sentence of a plain-text field, for a line that has room for one
// (review PR-24: «Dove», which opens a place's card with how to get there and
// leaves the rest of the text to «Dove si trova»). Plain text, so a line break
// the author typed ends a sentence too — "A piedi dal centro" over "In auto,
// parcheggio sulla Flacca" is two of them. A full stop ends one only after a
// word: the "S." of "Via S. Maria", the "n." of "bus n. 3" and the "S.S." of a
// state road are abbreviations, and a stop before a digit ("ca. 10 minuti") is
// not an end either.
export const firstSentence = (text: string): string => {
  const line = text.trim().split('\n')[0]!.trim()
  for (const match of line.matchAll(/[.!?…]+(?=\s+\S)/g)) {
    const end = match.index + match[0].length
    if (match[0] === '.') {
      const word = line.slice(0, match.index).split(/\s/).pop() ?? ''
      const next = line.slice(end).trimStart()
      if (word.length <= 2 || word.includes('.') || /^\d/.test(next)) continue
    }
    return line.slice(0, end)
  }
  return line
}
