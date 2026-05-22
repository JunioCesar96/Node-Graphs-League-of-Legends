import { describe, expect, it } from 'vitest'

import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import { demoCanvasScene } from '@/core/demoCanvasScene'
import { elementViewKeyForParameter, patchElementRetracted } from '@/core/elementViewState'
import { buildContextMenuItems } from '@/core/canvasContextMenuItems'
import type { CanvasContextTarget } from '@/core/canvasContextMenuTypes'
import { DEFAULT_CANVAS_TOOLBAR_VISIBILITY } from '@/core/canvasToolbarVisibility'

function stubNode(id: string): CanvasNode {
  return {
    id,
    position: { x: 0, y: 0 },
    node: {
      schema: {
        id: `schema-${id}`,
        title: id,
        parameters: [],
        internalStructures: [],
      },
      values: [],
    },
  }
}

function connection(
  fromNodeId: string,
  fromInternalStructureId: string,
  toNodeId: string,
): CanvasConnection {
  return {
    id: `${fromNodeId}:${fromInternalStructureId}->${toNodeId}`,
    fromNodeId,
    fromInternalStructureId,
    toNodeId,
    routing: 'wireless',
  }
}

describe('buildContextMenuItems element retracted', () => {
  const baseCtx = {
    canRedo: false,
    canUndo: false,
    glueNodeId: null,
    hasSelectAll: false,
    scene: demoCanvasScene,
    selectedNodeIds: [],
    viewportNavigateMode: false,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
  }

  it('mostra Retrair elemento quando expandido', () => {
    const canvasNode = demoCanvasScene.nodes[0]!
    const param = canvasNode.node.schema.parameters[0]
    if (!param) {
      return
    }

    const target: CanvasContextTarget = {
      type: 'element',
      nodeId: canvasNode.id,
      kind: 'parameter',
      elementId: param.id,
    }

    const items = buildContextMenuItems(target, baseCtx)
    const retractItem = items.find((item) => item.id === 'element.toggleRetracted')
    expect(retractItem?.label).toBe('Retrair elemento')
  })

  it('mostra Expandir elemento quando retraído', () => {
    const canvasNode = demoCanvasScene.nodes[0]!
    const param = canvasNode.node.schema.parameters[0]
    if (!param) {
      return
    }

    const key = elementViewKeyForParameter(param.id)
    const scene = {
      ...demoCanvasScene,
      nodes: demoCanvasScene.nodes.map((n) =>
        n.id === canvasNode.id
          ? { ...n, node: patchElementRetracted(n.node, key, true) }
          : n,
      ),
    }

    const target: CanvasContextTarget = {
      type: 'element',
      nodeId: canvasNode.id,
      kind: 'parameter',
      elementId: param.id,
    }

    const items = buildContextMenuItems(target, { ...baseCtx, scene })
    const retractItem = items.find((item) => item.id === 'element.toggleRetracted')
    expect(retractItem?.label).toBe('Expandir elemento')
  })
})

describe('buildContextMenuItems node hide linked children', () => {
  const baseCtx = {
    canRedo: false,
    canUndo: false,
    glueNodeId: null,
    hasSelectAll: false,
    viewportNavigateMode: false,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
  }

  const scene: CanvasScene = {
    nodes: [stubNode('a'), stubNode('b')],
    connections: [connection('a', 'out', 'b')],
  }

  const target: CanvasContextTarget = { type: 'node', nodeId: 'a' }

  it('mostra Ocultar todos os nodes filhos quando há ligações de saída', () => {
    const items = buildContextMenuItems(target, { ...baseCtx, scene, selectedNodeIds: ['a'] })
    const hideItem = items.find((item) => item.id === 'node.hideLinkedChildNodes')
    expect(hideItem?.label).toBe('Ocultar todos os nodes filhos')
    expect(hideItem?.disabled).toBe(false)
  })

  it('desactiva o item quando o nó não está seleccionado', () => {
    const items = buildContextMenuItems(target, { ...baseCtx, scene, selectedNodeIds: [] })
    const hideItem = items.find((item) => item.id === 'node.hideLinkedChildNodes')
    expect(hideItem?.disabled).toBe(true)
  })
})
