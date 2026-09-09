import type { CardBase } from './Content'

// No `pins` — a book is not a place, so libri's map footprint is 'none'
// (spec content.md, 2026-09-09), the same as dialetto.
export default interface Libro extends CardBase {
  // Not `author`: CardBase.author is the collaborator who wrote the card.
  book_author: string
  year: string
  publisher: string
}
