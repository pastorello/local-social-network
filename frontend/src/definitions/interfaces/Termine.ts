import type { CardBase } from './Content'

// No `pins` — dialetto's map footprint is 'none' (spec content.md).
export default interface Termine extends CardBase {
  term: string
  meaning: string
  example_usage: string
}
