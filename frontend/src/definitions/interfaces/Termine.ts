import type { CardBase } from './Content'

// No `pins` — dialetto's map footprint is 'none' (spec content.md).
// No `term`: the card's title is the word (decided 2026-09-09). It carried
// both, and the reader saw the same word twice on every dialect card.
export default interface Termine extends CardBase {
  meaning: string
  example_usage: string
}
