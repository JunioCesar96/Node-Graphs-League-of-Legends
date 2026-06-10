import { describe, expect, it } from 'vitest'

import {
  copyCanvasNodesToClipboard,
  hasCanvasNodeClipboard,
  pasteCanvasNodesFromClipboard,
} from '@/core/canvasNodeClipboard'
import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleParameters,
} from '@/core/blockTestFixtures'
import type { CanvasNode } from '@/core/canvasScene'
import { createNodeInstance, hydrateScene } from '@/core/canvasScene'

function mainCanvasNode(id: string, position: { x: number; y: number }): CanvasNode {
  const instance = createNodeInstance('main', `${id}-inst`)
  if (!instance) {
    throw new Error('schema main missing')
  }
  return { id, node: instance, position }
}

describe('canvasNodeClipboard', () => {
  it('copia e cola nós seleccionados com novos ids e deslocamento', () => {
    const blockNode = makeVfxEmitterCanvasNode({
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters,
        identification_codes: [],
      },
      position: { x: 100, y: 80 },
    })
    const ritualNode = mainCanvasNode('main-a', { x: 620, y: 80 })

    const scene = hydrateScene({
      ...makeVfxEmitterScene(blockNode),
      nodes: [blockNode, ritualNode],
    })

    expect(copyCanvasNodesToClipboard(scene, ['n-vfx', 'main-a'])).toBe(true)
    expect(hasCanvasNodeClipboard()).toBe(true)

    const pasted = pasteCanvasNodesFromClipboard(scene)
    expect(pasted).not.toBeNull()
    if (!pasted) {
      return
    }

    expect(pasted.scene.nodes).toHaveLength(4)
    expect(pasted.pastedNodeIds).toHaveLength(2)
    expect(pasted.pastedNodeIds.every((id) => !['n-vfx', 'main-a'].includes(id))).toBe(true)

    const pastedBlock = pasted.scene.nodes.find(
      (node) => pasted.pastedNodeIds.includes(node.id) && node.blockStructure,
    )
    expect(pastedBlock?.position).toEqual({ x: 148, y: 128 })
    expect(pastedBlock?.blockStructure?.blockName).toBe('Emitter')
  })

  it('não cola ligações com nós fora da selecção', () => {
    const blockNode = makeVfxEmitterCanvasNode({ position: { x: 0, y: 0 } })
    const ritualNode = mainCanvasNode('main-a', { x: 400, y: 0 })
    const otherNode = mainCanvasNode('main-b', { x: 800, y: 0 })

    const scene = hydrateScene({
      width: 1120,
      height: 760,
      nodes: [blockNode, ritualNode, otherNode],
      connections: [
        {
          id: 'main-a:out->n-vfx:in',
          fromNodeId: 'main-a',
          toNodeId: 'n-vfx',
          fromInternalStructureId: 'out',
        },
        {
          id: 'main-b:out->main-a:in',
          fromNodeId: 'main-b',
          toNodeId: 'main-a',
          fromInternalStructureId: 'out',
        },
      ],
    })

    copyCanvasNodesToClipboard(scene, ['n-vfx', 'main-a'])
    const pasted = pasteCanvasNodesFromClipboard(scene)
    expect(pasted).not.toBeNull()
    if (!pasted) {
      return
    }

    const pastedInternal = pasted.scene.connections.filter(
      (connection) =>
        pasted.pastedNodeIds.includes(connection.fromNodeId) &&
        pasted.pastedNodeIds.includes(connection.toNodeId),
    )
    expect(pastedInternal).toHaveLength(1)
    expect(pastedInternal[0]?.fromNodeId).not.toBe('main-b')
  })
})
