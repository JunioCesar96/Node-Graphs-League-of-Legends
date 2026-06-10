import { describe, expect, it } from 'vitest'

import type { CanvasNode } from '@/core/canvasScene'
import {
  applyGraphCanvasDragPositionOverride,
  createGraphCanvasDragPositionOverride,
  graphCanvasDragOverrideNodeIds,
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

describe('createGraphCanvasDragPositionOverride', () => {
  it('returns null for an empty positions map', () => {
    expect(createGraphCanvasDragPositionOverride({})).toBeNull()
  })
})

describe('graphCanvasDragOverrideNodeIds', () => {
  it('returns all dragged node ids', () => {
    expect(
      graphCanvasDragOverrideNodeIds(
        createGraphCanvasDragPositionOverride({
          a: { x: 1, y: 2 },
          b: { x: 3, y: 4 },
        }),
      ),
    ).toEqual(['a', 'b'])
  })
})

describe('resolveGraphCanvasNodeRenderPosition', () => {
  it('returns node position when no drag override is active', () => {
    const canvasNode = node('a', 10, 20)

    expect(resolveGraphCanvasNodeRenderPosition(canvasNode, null)).toEqual({ x: 10, y: 20 })
  })

  it('returns override position only for dragged nodes', () => {
    const canvasNode = node('a', 10, 20)
    const dragOverride = createGraphCanvasDragPositionOverride({
      a: { x: 99, y: 88 },
      other: { x: 1, y: 2 },
    })

    expect(resolveGraphCanvasNodeRenderPosition(canvasNode, dragOverride)).toEqual({ x: 99, y: 88 })
    expect(resolveGraphCanvasNodeRenderPosition(node('b', 10, 20), dragOverride)).toEqual({
      x: 10,
      y: 20,
    })
  })
})

describe('applyGraphCanvasDragPositionOverride', () => {
  it('returns the same array reference when override is null', () => {
    const nodes = [node('a', 1, 2), node('b', 3, 4)] as const

    expect(applyGraphCanvasDragPositionOverride(nodes, null)).toBe(nodes)
  })

  it('overrides only dragged node positions immutably', () => {
    const nodes = [node('a', 1, 2), node('b', 3, 4)]
    const next = applyGraphCanvasDragPositionOverride(
      nodes,
      createGraphCanvasDragPositionOverride({
        b: { x: 30, y: 40 },
      }),
    )

    expect(next).not.toBe(nodes)
    expect(next[0]).toBe(nodes[0])
    expect(next[1]?.position).toEqual({ x: 30, y: 40 })
  })

  it('overrides multiple dragged nodes at once', () => {
    const nodes = [node('a', 1, 2), node('b', 3, 4), node('c', 5, 6)]
    const next = applyGraphCanvasDragPositionOverride(
      nodes,
      createGraphCanvasDragPositionOverride({
        a: { x: 10, y: 20 },
        c: { x: 50, y: 60 },
      }),
    )

    expect(next[0]?.position).toEqual({ x: 10, y: 20 })
    expect(next[1]?.position).toEqual({ x: 3, y: 4 })
    expect(next[2]?.position).toEqual({ x: 50, y: 60 })
  })
})
