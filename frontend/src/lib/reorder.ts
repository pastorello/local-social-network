/**
 * Move one item of a list by `delta`, returning a new list.
 *
 * Shared by the two places where a reader can see the order and the author has
 * to be able to set it: the card's images, where the first is the cover (D5),
 * and a feste's route, where consecutive stops are what the polyline joins —
 * so a stop in the wrong place draws the procession going the wrong way.
 *
 * Out-of-range moves are a no-op rather than an error: the callers disable the
 * buttons at the ends, and a helper that throws when a disabled button is
 * somehow clicked would turn a cosmetic bug into a broken page.
 */
export const moveItem = <T>(list: T[], index: number, delta: number): T[] => {
  const target = index + delta
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list

  const next = [...list]
  const [item] = next.splice(index, 1)
  if (item !== undefined) next.splice(target, 0, item)
  return next
}
