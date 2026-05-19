import { describe, expect, it } from 'vitest'

import {
  appendEmbedSlotToBlock,
  listRemovableEmbedBlocks,
  removeEmbedSlotFromSchema,
} from '@/core/embedElementMenu'
import type { EmbedDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

const templateBlock: EmbedDefinition = {
  id: 'tpl-loadscreen',
  title: 'Loadscreen',
  internalStructures: [{ id: 'cat', name: 'CensoredImage', schemaId: 'censored-image' }],
}

const baseSchema: NodeSchemaDefinition = {
  id: 'skin',
  title: 'Skin',
  parameters: [],
  internalStructures: [],
  embed: [
    {
      ...templateBlock,
      id: 'inst-1',
      templateBlockId: templateBlock.id,
      slots: [],
    },
  ],
}

describe('embedElementMenu', () => {
  it('appendEmbedSlotToBlock adiciona no máximo um slot', () => {
    const structure = templateBlock.internalStructures[0]!
    const once = appendEmbedSlotToBlock(baseSchema, 'inst-1', structure)
    expect(once.embed?.[0]?.slots).toHaveLength(1)

    const twice = appendEmbedSlotToBlock(once, 'inst-1', structure)
    expect(twice.embed?.[0]?.slots).toHaveLength(1)
  })

  it('removeEmbedSlotFromSchema limpa slots do bloco', () => {
    const withSlot = appendEmbedSlotToBlock(baseSchema, 'inst-1', templateBlock.internalStructures[0]!)
    const slotId = withSlot.embed![0]!.slots![0]!.id
    const cleared = removeEmbedSlotFromSchema(withSlot, slotId)
    expect(cleared.embed?.[0]?.slots ?? []).toHaveLength(0)
  })

  it('listRemovableEmbedBlocks expõe blocos para − Element', () => {
    const items = listRemovableEmbedBlocks({
      id: 'n1',
      schema: baseSchema,
      values: {},
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.name).toBe('Loadscreen')
  })
})
