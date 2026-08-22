import type { CardBase, MapPoint } from './Content'

export default interface Ricetta extends CardBase {
  ingredients: string
  servings: string
  procedure: string
  pins: MapPoint[]
}
