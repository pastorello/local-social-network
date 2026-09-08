import { describe, it, expect } from 'vitest'

import { moveItem } from '../reorder'

describe('moveItem', () => {
  it('moves an item back and forward', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('carries an item across the list one step at a time', () => {
    let list = ['cattedrale', 'porto', 'piazza']
    list = moveItem(list, 1, 1)

    // The procession's order is the data: this is the sequence the polyline
    // joins, not a preference.
    expect(list).toEqual(['cattedrale', 'piazza', 'porto'])
  })

  it('does nothing at the ends rather than throwing', () => {
    const list = ['a', 'b']

    expect(moveItem(list, 0, -1)).toBe(list)
    expect(moveItem(list, 1, 1)).toBe(list)
    expect(moveItem(list, 5, -1)).toBe(list)
  })

  it('leaves the original list alone', () => {
    const list = ['a', 'b', 'c']
    moveItem(list, 0, 1)

    expect(list).toEqual(['a', 'b', 'c'])
  })
})
