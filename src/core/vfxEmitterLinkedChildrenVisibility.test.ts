import { describe, expect, it } from 'vitest'

import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { blockParameterSlotId } from '@/core/blockSchema'
import {
  applyHideLinkedChildrenForVfxEmitterNodes,
  isVfxEmitterDefinitionDataCanvasNode,
} from '@/core/vfxEmitterLinkedChildrenVisibility'

function stubNode(id: string, title: string): CanvasNode {
  return {
    id,
    position: { x: 0, y: 0 },
    node: {
      id,
      schema: { id, title, parameters: [], internalStructures: [] },
      values: [],
    },
  }
}

describe('vfxEmitterLinkedChildrenVisibility', () => {
  it('isVfxEmitterDefinitionDataCanvasNode reconhece título e blockType', () => {
    expect(
      isVfxEmitterDefinitionDataCanvasNode({
        ...stubNode('a', 'VfxEmitterDefinitionData'),
        blockViewActive: true,
        blockStructure: {
          blockType: 'VfxEmitterDefinitionData',
          blockName: 'Emitter',
          parameters: [],
          identification_codes: [],
        },
      }),
    ).toBe(true)
    expect(isVfxEmitterDefinitionDataCanvasNode(stubNode('b', 'Other'))).toBe(false)
  })

  it('applyHideLinkedChildrenForVfxEmitterNodes oculta filhos de bloco e de nó', () => {
    const emitterBlock: CanvasNode = {
      ...stubNode('emitter-block', 'VfxEmitterDefinitionData'),
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterBlock',
        parameters: [],
        identification_codes: [],
      },
    }

    const emitterNode = stubNode('emitter-node', 'VfxEmitterDefinitionData')
    const blockChild = stubNode('block-child', 'VfxPrimitiveMesh')
    const nodeChild = stubNode('node-child', 'IntegratedValueFloat')

    const scene: CanvasScene = {
      nodes: [emitterBlock, emitterNode, blockChild, nodeChild],
      connections: [
        {
          id: 'block-link',
          fromNodeId: 'emitter-block',
          toNodeId: 'block-child',
          fromInternalStructureId: '__block__:out',
          fromBlockSlotId: blockParameterSlotId('p1', 'output'),
          toBlockSlotId: 'slot-in',
        },
        {
          id: 'node-link',
          fromNodeId: 'emitter-node',
          toNodeId: 'node-child',
          fromInternalStructureId: 'out-slot',
          toInternalStructureId: 'in-slot',
        },
      ],
    }

    const next = applyHideLinkedChildrenForVfxEmitterNodes(scene)

    expect(next.nodes.find((node) => node.id === 'block-child')?.sceneHidden).toBe(true)
    expect(next.nodes.find((node) => node.id === 'node-child')?.sceneHidden).toBe(true)
    expect(next.nodes.find((node) => node.id === 'emitter-block')?.sceneHidden).toBeUndefined()
    expect(next.nodes.find((node) => node.id === 'emitter-node')?.sceneHidden).toBeUndefined()
  })
})
