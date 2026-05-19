import { describe, expect, it } from 'vitest'

import {
  ensurePointerSlots,
  pointerSlotId,
  populatedSlotsForPointer,
} from '@/core/pointerSlots'
import type { PointerDefinition } from '@/core/nodeSchema'

describe('pointerSlots', () => {
  it('gera id de slot e limita a um slot populado', () => {
    const block: PointerDefinition = {
      id: 'dynamics',
      title: 'Dynamics',
      internalStructures: [{ id: 'cat', name: 'ValueColor', schemaId: 'value-color' }],
      slots: [
        { id: 'wrong', name: 'A', schemaId: 'a' },
        { id: 'also-wrong', name: 'B', schemaId: 'b' },
      ],
    }

    const slots = populatedSlotsForPointer(block)
    expect(slots).toHaveLength(1)
    expect(slots[0]!.id).toBe(pointerSlotId('dynamics', 0))
    expect(ensurePointerSlots(block)).toHaveLength(1)
  })
})
