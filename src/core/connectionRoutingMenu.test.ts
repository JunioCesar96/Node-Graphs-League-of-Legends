import { describe, expect, it } from 'vitest'

import {
  parseSetConnectionRoutingMenuId,
  setConnectionRoutingMenuId,
} from '@/core/connectionRoutingMenu'

describe('connectionRoutingMenu', () => {
  it('round-trips menu id', () => {
    const id = setConnectionRoutingMenuId('conn:a->b', 'rigid')
    expect(parseSetConnectionRoutingMenuId(id)).toEqual({
      connectionId: 'conn:a->b',
      routing: 'rigid',
    })
  })
})
