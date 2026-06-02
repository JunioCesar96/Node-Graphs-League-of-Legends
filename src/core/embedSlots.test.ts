import { describe, expect, it } from 'vitest'

import {
  embedSlotId,
  ensureEmbedSlots,
  patchEmbedSlotInSchema,
  populatedSlotsForEmbed,
} from '@/core/embedSlots'
import type { EmbedDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

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

  it('patchEmbedSlotInSchema cria slot quando block.slots está vazio', () => {
    const block: EmbedDefinition = {
      id: 'emitter_embed_rate',
      title: 'rate',
      internalStructures: [{ id: 'cat', name: 'ValueFloat', schemaId: 'value-float' }],
      slots: [],
    }
    const schema: NodeSchemaDefinition = {
      id: 'emitter',
      title: 'Emitter',
      parameters: [],
      internalStructures: [],
      embed: [block],
    }
    const slotId = embedSlotId(block.id, 0)
    const next = patchEmbedSlotInSchema(schema, slotId, {
      id: slotId,
      name: 'ValueFloat',
      schemaId: 'value-float',
    })
    const patched = next.embed?.[0]
    expect(populatedSlotsForEmbed(patched!)).toHaveLength(1)
    expect(populatedSlotsForEmbed(patched!)[0]!.schemaId).toBe('value-float')
  })
})
