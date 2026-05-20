import { describe, expect, it } from 'vitest'

import { staticCanvasScene } from '@/core/canvasScene'
import { elementViewKeyForParameter, patchElementRetracted } from '@/core/elementViewState'
import { buildContextMenuItems } from '@/core/canvasContextMenuItems'
import type { CanvasContextTarget } from '@/core/canvasContextMenuTypes'
import { DEFAULT_CANVAS_TOOLBAR_VISIBILITY } from '@/core/canvasToolbarVisibility'

describe('buildContextMenuItems element retracted', () => {
  const baseCtx = {
    canRedo: false,
    canUndo: false,
    glueNodeId: null,
    hasSelectAll: false,
    scene: staticCanvasScene,
    selectedNodeIds: [],
    viewportNavigateMode: false,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
  }

  it('mostra Retrair elemento quando expandido', () => {
    const canvasNode = staticCanvasScene.nodes[0]!
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
    const canvasNode = staticCanvasScene.nodes[0]!
    const param = canvasNode.node.schema.parameters[0]
    if (!param) {
      return
    }

    const key = elementViewKeyForParameter(param.id)
    const scene = {
      ...staticCanvasScene,
      nodes: staticCanvasScene.nodes.map((n) =>
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
