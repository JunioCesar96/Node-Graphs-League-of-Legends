import { describe, expect, it } from 'vitest'

import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { createNodeInstance } from '@/core/canvasScene'
import {
  createCompactElementCanvasVisibility,
  isNodeVisibleOnCanvas,
} from '@/core/canvasNodePresentation'
import { computeCompactHiddenNodeIds } from '@/core/compactElementBranchVisibility'
import { elementViewKeyForListEmbed } from '@/core/elementViewState'
import { listEmbedSlotId } from '@/core/listEmbedSlots'
import type { NodeInstance } from '@/core/nodeSchema'
import {
  applySceneNodesStateSnapshot,
  captureSceneNodesStateSnapshot,
  createSceneNodesStatePreset,
  defaultSceneNodesStatePresetName,
  parseSceneNodesStatePresetsFile,
  serializeSceneNodesStatePresetsFile,
} from '@/core/sceneNodesStatePresets'
import { parseSceneChrome } from '@/core/scenePresentation'

function canvasNode(id: string, patch: Partial<CanvasNode> = {}): CanvasNode {
  const instance = createNodeInstance('main', `${id}-inst`)
  if (!instance) {
    throw new Error('schema main missing')
  }
  return {
    id,
    node: instance,
    position: { x: 0, y: 0 },
    ...patch,
  }
}

describe('sceneNodesStatePresets', () => {
  it('captura e aplica overlay de vários nós sem alterar nós fora do preset', () => {
    const scene: CanvasScene = {
      width: 1120,
      height: 760,
      nodes: [
        canvasNode('a', { locked: true, sceneHidden: true, displayLabel: 'Alpha' }),
        canvasNode('b', { bodyColorEnabled: true, bodyColor: 'rgba(1,2,3,1)' }),
        canvasNode('c'),
      ],
      connections: [],
    }

    const snapshot = captureSceneNodesStateSnapshot(scene)
    expect(snapshot.nodes.a?.locked).toBe(true)
    expect(snapshot.nodes.a?.sceneHidden).toBe(true)
    expect(snapshot.nodes.a?.displayLabel).toBe('Alpha')
    expect(snapshot.nodes.b?.bodyColorEnabled).toBe(true)

    const messy: CanvasScene = {
      ...scene,
      nodes: scene.nodes.map((node) => ({ ...node, locked: undefined, sceneHidden: undefined })),
    }

    const restored = applySceneNodesStateSnapshot(messy, snapshot)
    expect(restored.nodes.find((n) => n.id === 'a')?.locked).toBe(true)
    expect(restored.nodes.find((n) => n.id === 'a')?.sceneHidden).toBe(true)
    expect(restored.nodes.find((n) => n.id === 'a')?.displayLabel).toBe('Alpha')
    expect(restored.nodes.find((n) => n.id === 'b')?.bodyColor).toBe('rgba(1,2,3,1)')
    expect(restored.nodes.find((n) => n.id === 'c')?.locked).toBeUndefined()
  })

  it('captura e restaura posição da câmera', () => {
    const scene: CanvasScene = {
      width: 1120,
      height: 760,
      nodes: [canvasNode('a')],
      connections: [],
      camera: { pan: { x: 120, y: -80 }, scale: 1.25 },
    }

    const snapshot = captureSceneNodesStateSnapshot(scene)
    expect(snapshot.camera).toEqual({ pan: { x: 120, y: -80 }, scale: 1.25 })

    const moved: CanvasScene = {
      ...scene,
      camera: { pan: { x: 0, y: 0 }, scale: 1 },
    }

    const restored = applySceneNodesStateSnapshot(moved, snapshot)
    expect(restored.camera).toEqual({ pan: { x: 120, y: -80 }, scale: 1.25 })
  })

  it('presets antigos sem câmera não alteram a vista actual', () => {
    const scene: CanvasScene = {
      width: 1120,
      height: 760,
      nodes: [canvasNode('a')],
      connections: [],
      camera: { pan: { x: 10, y: 20 }, scale: 2 },
    }

    const snapshot = captureSceneNodesStateSnapshot({
      ...scene,
      camera: undefined,
    })
    expect(snapshot.camera).toBeUndefined()

    const restored = applySceneNodesStateSnapshot(scene, snapshot)
    expect(restored.camera).toEqual({ pan: { x: 10, y: 20 }, scale: 2 })
  })

  it('restaura linkVisibilityFilter e re-aplica filtro', () => {
    const scene: CanvasScene = {
      width: 1120,
      height: 760,
      nodes: [canvasNode('keep'), canvasNode('hide', { sceneHidden: true })],
      connections: [],
      linkVisibilityFilter: { mode: 'branch', seedNodeId: 'keep' },
    }

    const snapshot = captureSceneNodesStateSnapshot(scene)
    const cleared: CanvasScene = {
      ...scene,
      linkVisibilityFilter: undefined,
      nodes: scene.nodes.map((n) => ({ ...n, sceneHidden: undefined })),
    }

    const next = applySceneNodesStateSnapshot(cleared, snapshot)
    expect(next.linkVisibilityFilter).toEqual({ mode: 'branch', seedNodeId: 'keep' })
    expect(next.nodes.find((n) => n.id === 'hide')?.sceneHidden).toBe(true)
  })

  it('parse e serialize ficheiro JSON da biblioteca', () => {
    const scene: CanvasScene = {
      width: 1120,
      height: 760,
      nodes: [canvasNode('only', { locked: true })],
      connections: [],
    }
    const preset = createSceneNodesStatePreset('Teste', scene)
    const json = serializeSceneNodesStatePresetsFile([preset])
    const parsed = parseSceneNodesStatePresetsFile(JSON.parse(json))

    expect(parsed?.presets).toHaveLength(1)
    expect(parsed?.presets[0]?.name).toBe('Teste')
    expect(parsed?.presets[0]?.snapshot.nodes.only?.locked).toBe(true)
    expect(parseSceneNodesStatePresetsFile({ kind: 'wrong' })).toBeUndefined()
  })

  it('defaultSceneNodesStatePresetName evita colisão', () => {
    const existing = [createSceneNodesStatePreset('Estado 1', {
      width: 1,
      height: 1,
      nodes: [],
      connections: [],
    })]
    expect(defaultSceneNodesStatePresetName(existing)).toBe('Estado 2')
  })

  it('captura listEmbed compact index e restaura ocultação na árvore + wireless', () => {
    const blockId = 'list-embed-block'
    const listKey = elementViewKeyForListEmbed(blockId)

    const parentNode: NodeInstance = {
      id: 'parent-inst',
      schema: {
        id: 'parent.schema',
        title: 'Parent',
        parameters: [],
        listEmbed: [
          {
            id: blockId,
            title: 'Items',
            internalStructures: [
              { id: 'cat-a', name: 'TypeA', schemaId: 'schema-a' },
              { id: 'cat-b', name: 'TypeB', schemaId: 'schema-b' },
            ],
            slots: [
              { id: listEmbedSlotId(blockId, 0), name: 'TypeA', schemaId: 'schema-a' },
              { id: listEmbedSlotId(blockId, 1), name: 'TypeB', schemaId: 'schema-b' },
            ],
          },
        ],
        internalStructures: [],
      },
      values: [],
      elementView: { [listKey]: { mode: 'compact', selectedIndex: 0 } },
    }

    const childInstance = (id: string): NodeInstance => ({
      id: `${id}-inst`,
      schema: { id: 'child.schema', title: 'Child', parameters: [], internalStructures: [] },
      values: [],
    })

    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [
        { id: 'parent', position: { x: 0, y: 0 }, node: parentNode },
        { id: 'child-a', position: { x: 200, y: 0 }, node: childInstance('child-a') },
        { id: 'child-b', position: { x: 400, y: 0 }, node: childInstance('child-b') },
      ],
      connections: [
        {
          id: 'la',
          fromNodeId: 'parent',
          fromInternalStructureId: listEmbedSlotId(blockId, 0),
          toNodeId: 'child-a',
        },
        {
          id: 'lb',
          fromNodeId: 'parent',
          fromInternalStructureId: listEmbedSlotId(blockId, 1),
          toNodeId: 'child-b',
        },
      ],
    }

    expect(computeCompactHiddenNodeIds(scene).has('child-b')).toBe(true)

    const snapshot = captureSceneNodesStateSnapshot(scene)
    expect(snapshot.nodes.parent?.elementView?.[listKey]).toEqual({
      mode: 'compact',
      selectedIndex: 0,
    })

    const changed: CanvasScene = {
      ...scene,
      nodes: scene.nodes.map((canvasNode) =>
        canvasNode.id === 'parent'
          ? {
              ...canvasNode,
              node: {
                ...canvasNode.node,
                elementView: { [listKey]: { mode: 'compact', selectedIndex: 1 } },
              },
            }
          : canvasNode,
      ),
    }

    expect(computeCompactHiddenNodeIds(changed).has('child-a')).toBe(true)

    const restored = applySceneNodesStateSnapshot(changed, snapshot)
    const parentRestored = restored.nodes.find((n) => n.id === 'parent')!

    expect(parentRestored.node.elementView?.[listKey]?.selectedIndex).toBe(0)
    expect(computeCompactHiddenNodeIds(restored).has('child-b')).toBe(true)

    const compactVisibility = createCompactElementCanvasVisibility(restored)
    const childB = restored.nodes.find((n) => n.id === 'child-b')!
    expect(isNodeVisibleOnCanvas(childB, compactVisibility)).toBe(false)

    const childA = restored.nodes.find((n) => n.id === 'child-a')!
    expect(isNodeVisibleOnCanvas(childA, compactVisibility)).toBe(true)
  })

  it('parseSceneChrome aceita toolbarCollapsed false', () => {
    expect(parseSceneChrome({ toolbarCollapsed: false })).toEqual({ toolbarCollapsed: false })
  })

  it('parseSceneChrome round-trip com presets', () => {
    const preset = createSceneNodesStatePreset('Layout A', {
      width: 1120,
      height: 760,
      nodes: [canvasNode('n1', { locked: true })],
      connections: [],
    })
    const chrome = parseSceneChrome({
      sceneNodes: {
        minimized: false,
        sortMode: 'name',
        presets: [preset],
      },
    })
    expect(chrome?.sceneNodes?.presets).toHaveLength(1)
    expect(chrome?.sceneNodes?.presets?.[0]?.name).toBe('Layout A')
  })
})
