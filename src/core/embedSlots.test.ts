import { describe, expect, it } from 'vitest'

import {
  embedSlotId,
  ensureEmbedSlots,
  populatedSlotsForEmbed,
} from '@/core/embedSlots'
import type { EmbedDefinition } from '@/core/nodeSchema'

describe('embedSlots', () => {
  it('gera id de slot e limita a um slot populado', () => {
    const block: EmbedDefinition = {
      id: 'loadscreen',
      title: 'Loadscreen',
      internalStructures: [{ id: 'cat', name: 'CensoredImage', schemaId: 'censored-image' }],
      slots: [
        { id: 'wrong', name: 'A', schemaId: 'a' },
        { id: 'also-wrong', name: 'B', schemaId: 'b' },
      ],
    }

    const slots = populatedSlotsForEmbed(block)
    expect(slots).toHaveLength(1)
    expect(slots[0]!.id).toBe(embedSlotId('loadscreen', 0))
    expect(ensureEmbedSlots(block)).toHaveLength(1)
  })
})
