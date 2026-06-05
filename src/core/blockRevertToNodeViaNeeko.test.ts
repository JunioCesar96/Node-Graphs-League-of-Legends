import { describe, expect, it } from 'vitest'

import {
  applyBlockRevertNeekoToScene,
  collectBlockSlotLinkedNodeIds,
} from '@/core/blockRevertToNodeViaNeeko'
import type { CanvasScene } from '@/core/canvasScene'
import { blockParameterSlotId } from '@/core/blockSchema'

function makeScene(): CanvasScene {
  return {
    nodes: [
      {
        id: 'root',
        position: { x: 0, y: 0 },
        node: {
          id: 'root',
          schema: { id: 'block-root', title: 'Root', parameters: [], internalStructures: [] },
          values: [],
        },
        blockViewActive: true,
        blockStructure: {
          blockType: 'TestBlock',
          blockName: 'Root',
          parameters: [],
          identification_codes: [],
        },
      },
      {
        id: 'child-a',
        position: { x: 100, y: 0 },
        node: {
          id: 'child-a',
          schema: { id: 'child', title: 'Child', parameters: [], internalStructures: [] },
          values: [],
        },
      },
      {
        id: 'child-b',
        position: { x: 200, y: 0 },
        node: {
          id: 'child-b',
          schema: { id: 'child', title: 'Child B', parameters: [], internalStructures: [] },
          values: [],
        },
      },
    ],
    connections: [
      {
        id: 'block-link-1',
        fromNodeId: 'root',
        toNodeId: 'child-a',
        fromBlockSlotId: blockParameterSlotId('p1', 'output'),
        toBlockSlotId: 'slot-in',
      },
      {
        id: 'block-link-2',
        fromNodeId: 'child-a',
        toNodeId: 'child-b',
        fromBlockSlotId: blockParameterSlotId('p2', 'output'),
        toBlockSlotId: 'slot-in-2',
      },
      {
        id: 'normal-link',
        fromNodeId: 'external',
        toNodeId: 'root',
        fromInternalStructureId: 'out',
        toInternalStructureId: 'in',
      },
    ],
  }
}

describe('blockRevertToNodeViaNeeko', () => {
  it('collectBlockSlotLinkedNodeIds percorre filhos ligados por slots de bloco', () => {
    const linked = collectBlockSlotLinkedNodeIds(makeScene(), 'root')
    expect(linked).toEqual(new Set(['child-a', 'child-b']))
  })

  it('applyBlockRevertNeekoToScene remove vista de bloco, ligações de bloco e filhos órfãos', () => {
    const scene = makeScene()
    const plan = {
      nodes: [
        {
          id: 'root',
          position: { x: 0, y: 0 },
          node: {
            id: 'root',
            schema: { id: 'value-float', title: 'Float', parameters: [], internalStructures: [], tag: 'neeko' },
            values: [],
          },
        },
        {
          id: 'new-child',
          position: { x: 520, y: 0 },
          node: {
            id: 'new-child',
            schema: { id: 'value-float', title: 'Float 2', parameters: [], internalStructures: [], tag: 'neeko' },
            values: [],
          },
        },
      ],
      connections: [],
      warnings: [],
      rootCanvasNodeId: 'root',
      rootParsedId: 'value-float',
    }

    const next = applyBlockRevertNeekoToScene(scene, 'root', plan)
    const root = next.nodes.find((node) => node.id === 'root')

    expect(root?.blockViewActive).toBeUndefined()
    expect(root?.blockStructure).toBeUndefined()
    expect(next.nodes.some((node) => node.id === 'child-a')).toBe(false)
    expect(next.nodes.some((node) => node.id === 'child-b')).toBe(false)
    expect(next.nodes.some((node) => node.id === 'new-child')).toBe(true)
    expect(next.connections.every((connection) => !connection.fromBlockSlotId && !connection.toBlockSlotId)).toBe(
      true,
    )
  })
})
