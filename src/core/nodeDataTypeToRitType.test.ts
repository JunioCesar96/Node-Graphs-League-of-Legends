import { describe, expect, it } from 'vitest'

import { nodeDataTypeToRitType } from '@/core/nodeDataTypeToRitType'

describe('nodeDataTypeToRitType', () => {
  it('mantém bool e flag distintos', () => {
    expect(nodeDataTypeToRitType('bool', 'disableBackfaceCull')).toBe('bool')
    expect(nodeDataTypeToRitType('flag', 'isGroundLayer')).toBe('flag')
  })
})
