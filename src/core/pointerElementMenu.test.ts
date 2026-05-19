import { describe, expect, it } from 'vitest'

import {
  appendPointerSlotToBlock,
  listRemovablePointerBlocks,
  removePointerSlotFromSchema,
} from '@/core/pointerElementMenu'
import type { NodeSchemaDefinition, PointerDefinition } from '@/core/nodeSchema'

const templateBlock: PointerDefinition = {
  id: 'tpl-dynamics',
  title: 'Dynamics',
  internalStructures: [{ id: 'cat', name: 'ValueColor', schemaId: 'value-color' }],
}

const baseSchema: NodeSchemaDefinition = {
  id: 'emitter',
  title: 'Emitter',
  parameters: [],
  internalStructures: [],
  pointer: [
    {
      ...templateBlock,
      id: 'inst-1',
      templateBlockId: templateBlock.id,
      slots: [],
    },
  ],
}

describe('pointerElementMenu', () => {
  it('appendPointerSlotToBlock adiciona no máximo um slot', () => {
    const structure = templateBlock.internalStructures[0]!
    const once = appendPointerSlotToBlock(baseSchema, 'inst-1', structure)
    expect(once.pointer?.[0]?.slots).toHaveLength(1)

    const twice = appendPointerSlotToBlock(once, 'inst-1', structure)
    expect(twice.pointer?.[0]?.slots).toHaveLength(1)
  })

  it('removePointerSlotFromSchema limpa slots do bloco', () => {
    const withSlot = appendPointerSlotToBlock(baseSchema, 'inst-1', templateBlock.internalStructures[0]!)
    const slotId = withSlot.pointer![0]!.slots![0]!.id
    const cleared = removePointerSlotFromSchema(withSlot, slotId)
    expect(cleared.pointer?.[0]?.slots ?? []).toHaveLength(0)
  })

  it('listRemovablePointerBlocks expõe blocos para − Element', () => {
    const items = listRemovablePointerBlocks({
      id: 'n1',
      schema: baseSchema,
      values: {},
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.name).toBe('Dynamics')
  })
})
