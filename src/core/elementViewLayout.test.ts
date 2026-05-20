import { describe, expect, it } from 'vitest'

import {
  mapHashStructureCompactHeight,
  mapHashStructureListHeight,
  listSlotsCompactHeight,
} from '@/core/elementViewLayout'

describe('elementViewLayout', () => {
  it('compact map height is smaller than list for many entries', () => {
    const list = mapHashStructureListHeight(10, true)
    const compact = mapHashStructureCompactHeight(true)
    expect(compact).toBeLessThan(list)
  })

  it('listSlotsCompactHeight includes pager', () => {
    expect(listSlotsCompactHeight(42)).toBeGreaterThan(42 + 28)
  })
})
