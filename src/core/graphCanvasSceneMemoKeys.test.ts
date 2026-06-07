import { describe, expect, it } from 'vitest'

import type { CanvasNode } from '@/core/canvasScene'
import {
  graphCanvasNodePositionsKey,
  graphCanvasWirelessDisplayKey,
} from '@/core/graphCanvasSceneMemoKeys'

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

describe('graphCanvasNodePositionsKey', () => {
  it('changes when a node position changes', () => {
    const before = graphCanvasNodePositionsKey([node('a', 0, 0)])
    const after = graphCanvasNodePositionsKey([node('a', 10, 0)])

    expect(before).not.toBe(after)
  })
})

describe('graphCanvasWirelessDisplayKey', () => {
  it('stays stable when only positions change', () => {
    const nodesA = [node('a', 0, 0), node('b', 100, 200)]
    const nodesB = [node('a', 500, 600), node('b', 700, 800)]

    expect(graphCanvasWirelessDisplayKey([], nodesA)).toBe(graphCanvasWirelessDisplayKey([], nodesB))
  })
})
