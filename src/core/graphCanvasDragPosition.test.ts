import { describe, expect, it } from 'vitest'

import type { CanvasNode } from '@/core/canvasScene'
import {
  applyGraphCanvasDragPositionOverride,
  resolveGraphCanvasNodeRenderPosition,
} from '@/core/graphCanvasDragPosition'

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

describe('resolveGraphCanvasNodeRenderPosition', () => {
  it('returns node position when no drag override is active', () => {
    const canvasNode = node('a', 10, 20)

    expect(resolveGraphCanvasNodeRenderPosition(canvasNode, null)).toEqual({ x: 10, y: 20 })
  })

  it('returns override position only for the dragged node', () => {
    const canvasNode = node('a', 10, 20)

    expect(
      resolveGraphCanvasNodeRenderPosition(canvasNode, { nodeId: 'a', x: 99, y: 88 }),
    ).toEqual({ x: 99, y: 88 })
    expect(
      resolveGraphCanvasNodeRenderPosition(canvasNode, { nodeId: 'other', x: 99, y: 88 }),
    ).toEqual({ x: 10, y: 20 })
  })
})

describe('applyGraphCanvasDragPositionOverride', () => {
  it('returns the same array reference when override is null', () => {
    const nodes = [node('a', 1, 2), node('b', 3, 4)] as const

    expect(applyGraphCanvasDragPositionOverride(nodes, null)).toBe(nodes)
  })

  it('overrides only the dragged node position immutably', () => {
    const nodes = [node('a', 1, 2), node('b', 3, 4)]
    const next = applyGraphCanvasDragPositionOverride(nodes, { nodeId: 'b', x: 30, y: 40 })

    expect(next).not.toBe(nodes)
    expect(next[0]).toBe(nodes[0])
    expect(next[1]).not.toBe(nodes[1])
    expect(next[1]?.position).toEqual({ x: 30, y: 40 })
  })
})
