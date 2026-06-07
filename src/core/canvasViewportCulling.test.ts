import { describe, expect, it } from 'vitest'

import type { CanvasNode } from '@/core/canvasScene'
import {
  collectCanvasRenderNodeIds,
  collectVisibleCanvasNodes,
  computeGraphViewportRect,
  intersectsGraphRects,
} from '@/core/canvasViewportCulling'

function node(id: string, x: number, y: number): CanvasNode {
  return {
    id,
    position: { x, y },
    node: {
      schema: { id: 'test', title: 'Test', parameters: [] },
      values: [],
    },
  } as CanvasNode
}

describe('computeGraphViewportRect', () => {
  it('maps viewport corners to graph coordinates with pan and scale', () => {
    const rect = computeGraphViewportRect(800, 600, { x: 100, y: 50 }, 2, 0)

    expect(rect).toEqual({
      x: -50,
      y: -25,
      width: 400,
      height: 300,
    })
  })

  it('returns null for invalid viewport', () => {
    expect(computeGraphViewportRect(0, 600, { x: 0, y: 0 }, 1)).toBeNull()
  })
})

describe('intersectsGraphRects', () => {
  it('detects overlap', () => {
    const viewport = { x: 0, y: 0, width: 100, height: 100 }
    expect(intersectsGraphRects(viewport, { x: 80, y: 80, width: 40, height: 40 })).toBe(true)
    expect(intersectsGraphRects(viewport, { x: 200, y: 200, width: 10, height: 10 })).toBe(false)
  })
})

describe('collectCanvasRenderNodeIds', () => {
  const measureBounds = (canvasNode: CanvasNode) => ({
    x: canvasNode.position.x,
    y: canvasNode.position.y,
    width: 120,
    height: 80,
  })

  it('keeps only in-viewport policy-visible nodes', () => {
    const viewport = { x: 0, y: 0, width: 200, height: 200 }
    const nodes = [node('in', 10, 10), node('out', 900, 900)]

    const ids = collectCanvasRenderNodeIds({
      nodes,
      viewport,
      measureBounds,
      isPolicyVisible: () => true,
    })

    expect([...ids]).toEqual(['in'])
  })

  it('always includes forced node ids even off viewport', () => {
    const viewport = { x: 0, y: 0, width: 100, height: 100 }
    const nodes = [node('far', 5000, 5000)]

    const ids = collectCanvasRenderNodeIds({
      nodes,
      viewport,
      measureBounds,
      forceNodeIds: new Set(['far']),
      isPolicyVisible: () => true,
    })

    expect([...ids]).toEqual(['far'])
  })

  it('renders nothing off-viewport when viewport is unknown', () => {
    const ids = collectCanvasRenderNodeIds({
      nodes: [node('a', 0, 0)],
      viewport: null,
      measureBounds,
      isPolicyVisible: () => true,
    })

    expect(ids.size).toBe(0)
  })

  it('uses overridden node position for viewport intersection during drag', () => {
    const viewport = { x: 0, y: 0, width: 200, height: 200 }
    const dragged = {
      ...node('drag', 500, 500),
      position: { x: 500, y: 500 },
    }
    const layoutNodes = [{ ...dragged, position: { x: 20, y: 20 } }]

    const ids = collectCanvasRenderNodeIds({
      nodes: layoutNodes,
      viewport,
      measureBounds,
      isPolicyVisible: () => true,
    })

    expect([...ids]).toEqual(['drag'])
  })
})

describe('collectVisibleCanvasNodes', () => {
  it('returns only nodes whose ids are in the render set, preserving scene order', () => {
    const nodes = [node('a', 0, 0), node('b', 10, 10), node('c', 20, 20)]
    const renderIds = new Set(['b', 'c'])

    expect(collectVisibleCanvasNodes(nodes, renderIds).map((entry) => entry.id)).toEqual(['b', 'c'])
  })
})
