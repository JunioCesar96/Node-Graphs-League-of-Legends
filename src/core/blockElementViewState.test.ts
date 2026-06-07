import { describe, expect, it } from 'vitest'

import type { CanvasNode } from '@/core/canvasScene'
import {
  applyLightModeCompactToBlockNode,
  blockElementViewKeyForParameter,
  blockElementViewKeyForSlot,
  buildBlockOutputSlotIndexMap,
  getBlockElementViewState,
  patchBlockElementSelectedIndex,
  resolveBlockOutputSlotConnectionIndexFromNode,
} from '@/core/blockElementViewState'
import { blockParameterSlotId } from '@/core/blockSchema'
import { listPointerSlotId } from '@/core/listPointerSlots'

function blockNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: 'block-a',
    position: { x: 0, y: 0 },
    node: { id: 'block-a', schema: { id: 'x', title: 'X', parameters: [] }, values: [] },
    blockViewActive: true,
    blockStructure: {
      blockType: 'Main',
      blockName: 'Main',
      parameters: [
        {
          idParameter: 'entries',
          nameParameter: 'entries',
          typeParameter: 'mapHashEmbed',
          defaultValue: '',
          sourcePath: { kind: 'parameter', parameterId: 'entries' },
        },
      ],
      identification_codes: [],
    },
    ...overrides,
  }
}

describe('blockElementViewState', () => {
  it('defaults entries parameter to compact index 0', () => {
    const node = blockNode()
    const key = blockElementViewKeyForParameter('entries')
    expect(getBlockElementViewState(node, key)).toEqual({ mode: 'compact', selectedIndex: 0 })
  })

  it('patchBlockElementSelectedIndex persists on canvas node', () => {
    const key = blockElementViewKeyForParameter('entries')
    const next = patchBlockElementSelectedIndex(blockNode(), key, 2)
    expect(next.blockElementView?.[key]?.selectedIndex).toBe(2)
  })

  it('applyLightModeCompactToBlockNode forces compact and initBlockIndices', () => {
    const node = blockNode({
      blockElementView: {
        [blockElementViewKeyForParameter('entries')]: { mode: 'list', selectedIndex: 3 },
      },
    })
    const next = applyLightModeCompactToBlockNode(node, { initBlockIndices: true })
    const key = blockElementViewKeyForParameter('entries')
    expect(getBlockElementViewState(next, key)).toEqual({ mode: 'compact', selectedIndex: 0 })
  })

  it('resolveBlockOutputSlotConnectionIndexFromNode uses light mode default 0', () => {
    const node = blockNode()
    expect(
      resolveBlockOutputSlotConnectionIndexFromNode(node, 'slot-out', 3, {
        lightModeDefaultFirst: true,
      }),
    ).toBe(0)
    expect(resolveBlockOutputSlotConnectionIndexFromNode(node, 'slot-out', 3)).toBe(2)
  })

  it('resolveBlockOutputSlotConnectionIndexFromNode reads stored slot index', () => {
    const slotId = 'block-param:p:output'
    const node = blockNode({
      blockElementView: {
        [blockElementViewKeyForSlot(slotId)]: { mode: 'compact', selectedIndex: 1 },
      },
    })
    expect(resolveBlockOutputSlotConnectionIndexFromNode(node, slotId, 3)).toBe(1)
  })

  it('applyLightModeCompactToBlockNode forces compact on list[pointer] fan-out slot', () => {
    const listParamId = 'complexEmitterDefinitionData_list_pointer'
    const outputSlot = blockParameterSlotId(listParamId, 'output')
    const node = blockNode({
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [
          {
            idParameter: listParamId,
            nameParameter: 'complexEmitterDefinitionData',
            typeParameter: 'VfxEmitterDefinitionData',
            defaultValue: '',
            listParameter: true,
            sourcePath: {
              kind: 'pointerChild',
              pointerId: 'catalog-ptr',
              slotId: 'catalog-ptr-slot',
            },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [blockElementViewKeyForSlot(outputSlot)]: { mode: 'list', selectedIndex: 4 },
      },
    })

    const next = applyLightModeCompactToBlockNode(node)
    expect(getBlockElementViewState(next, blockElementViewKeyForSlot(outputSlot))).toEqual({
      mode: 'compact',
      selectedIndex: 4,
    })
  })

  it('buildBlockOutputSlotIndexMap inclui saída agregada de list[pointer]', () => {
    const listParamId = 'complexEmitterDefinitionData_list_pointer'
    const outputSlot = blockParameterSlotId(listParamId, 'output')
    const parent: CanvasNode = {
      id: 'system',
      position: { x: 0, y: 0 },
      node: { id: 'system', schema: { id: 'x', title: 'X', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [
          {
            idParameter: listParamId,
            nameParameter: 'complexEmitterDefinitionData',
            typeParameter: 'VfxEmitterDefinitionData',
            defaultValue: '',
            listParameter: true,
            sourcePath: {
              kind: 'pointerChild',
              pointerId: 'catalog-ptr',
              slotId: 'catalog-ptr-slot',
            },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [blockElementViewKeyForSlot(outputSlot)]: { mode: 'compact', selectedIndex: 1 },
      },
    }
    const childA: CanvasNode = {
      id: 'emitter-a',
      position: { x: 400, y: 0 },
      node: { id: 'emitter-a', schema: { id: 'y', title: 'Y', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterA',
        parameters: [],
        identification_codes: [],
      },
    }
    const childB: CanvasNode = {
      id: 'emitter-b',
      position: { x: 800, y: 0 },
      node: { id: 'emitter-b', schema: { id: 'z', title: 'Z', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterB',
        parameters: [],
        identification_codes: [],
      },
    }
    const scene = {
      width: 1200,
      height: 800,
      nodes: [parent, childA, childB],
      connections: [
        {
          id: 'c0',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${listPointerSlotId(listParamId, 0)}`,
          fromBlockSlotId: listPointerSlotId(listParamId, 0),
          toNodeId: 'emitter-a',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'c1',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${listPointerSlotId(listParamId, 1)}`,
          fromBlockSlotId: listPointerSlotId(listParamId, 1),
          toNodeId: 'emitter-b',
          toBlockSlotId: 'block-header:in:0',
        },
      ],
    }

    const map = buildBlockOutputSlotIndexMap(scene, { lightModeDefaultFirst: true })
    expect(map.get(`system::${outputSlot}`)).toBe(1)
  })
})
