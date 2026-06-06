import { describe, expect, it } from 'vitest'

import {
  graphPointAtViewportCenter,
  resolveSelectionPivotCenter,
} from '@/core/graphSnapMenu/graphSnapMenuGeometry'
import type { CanvasNode } from '@/core/canvasScene'

describe('graphSnapMenuGeometry', () => {
  it('calcula o centro da selecção', () => {
    const nodes = [
      {
        id: 'a',
        position: { x: 0, y: 0 },
      },
      {
        id: 'b',
        position: { x: 100, y: 40 },
      },
    ] as CanvasNode[]

    expect(
      resolveSelectionPivotCenter(nodes, ['a', 'b'], (node) => ({
        x: node.position.x,
        y: node.position.y,
        width: 100,
        height: 50,
      })),
    ).toEqual({ x: 100, y: 45 })
  })

  it('converte o centro do viewport para coordenadas da grade', () => {
    expect(graphPointAtViewportCenter(800, 600, { x: 400, y: 300 }, 1)).toEqual({
      x: 0,
      y: 0,
    })
  })
})
