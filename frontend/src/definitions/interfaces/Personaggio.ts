import type { CardBase, MapPoint } from './Content'

export default interface Personaggio extends CardBase {
  life_dates: string
  pins: MapPoint[]
}
