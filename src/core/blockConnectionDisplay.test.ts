import { describe, expect, it } from 'vitest'

import { buildBlockWirelessDisplayByNode } from './blockConnectionDisplay'
import { blockParameterSlotId } from './blockSchema'
import type { CanvasConnection, CanvasNode } from './canvasScene'
import { listEmbedSlotId } from './listEmbedSlots'

function makeBlockNode(
  id: string,
  structure: NonNullable<CanvasNode['blockStructure']>,
): CanvasNode {
  return {
    id,
    node: {
      schema: { id: 'schema', title: structure.blockType, parameters: [] },
      values: [],
    },
    position: { x: 0, y: 0 },
    blockStructure: structure,
    blockViewActive: true,
  }
}

describe('buildBlockWirelessDisplayByNode', () => {
  it('espelha ligação list[embed] indexada no slot de saída canónico do parâmetro', () => {
    const birthColorId = 'birthColor'
    const indexedSlot = listEmbedSlotId(birthColorId, 0)
    const canonicalSlot = blockParameterSlotId(birthColorId, 'output')
    const childInput = 'block-header:ValueColor:0:birthColor'

    const parent = makeBlockNode('emitter', {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [
        {
          idParameter: birthColorId,
          nameParameter: 'birthColor',
          typeParameter: 'ValueColor',
          defaultValue: '',
          listParameter: true,
          slotRules: { outputs: ['ValueColor'] },
          sourcePath: {
            kind: 'embedChild',
            embedId: 'leb-1',
            slotId: indexedSlot,
            childParameterId: 'child-1',
          },
        },
      ],
      identification_codes: [],
    })

    const child = makeBlockNode('value-color', {
      blockType: 'ValueColor',
      blockName: 'ValueColor',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[birthColor]', 'out[ValueColorPreview]'],
        parentBlockField: 'birthColor',
      },
    })

    const connection: CanvasConnection = {
      id: 'block:emitter:out->value-color:in',
      fromNodeId: 'emitter',
      fromInternalStructureId: `__block__:${indexedSlot}`,
      toNodeId: 'value-color',
      routing: 'wireless',
      fromBlockSlotId: indexedSlot,
      fromBlockParameterId: birthColorId,
      toBlockSlotId: childInput,
    }

    const displayByNode = buildBlockWirelessDisplayByNode([connection], [parent, child])
    const parentDisplay = displayByNode.get('emitter')

    expect(parentDisplay?.slots.get(indexedSlot)?.peerNodeId).toBe('value-color')
    expect(parentDisplay?.slots.get(canonicalSlot)?.peerNodeId).toBe('value-color')
    expect(parentDisplay?.linked).toBe(true)
  })
})
