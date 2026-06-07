import { describe, expect, it } from 'vitest'

import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { applyBlockOrganizationToScene } from './blockOrganizationLayout'

function blockNode(id: string, x: number, y: number, height = 120): CanvasNode {
  return {
    id,
    position: { x, y },
    node: {
      id,
      schema: { id, title: 'VfxEmitterDefinitionData', parameters: [] },
      values: [],
    },
    blockViewActive: true,
    blockStructure: {
      blockType: 'VfxEmitterDefinitionData',
      blockName: id,
      parameters: [{ idParameter: 'p1', nameParameter: 'rate', typeParameter: 'f32', defaultValue: '1' }],
      identification_codes: [],
    },
    blockElementView: {},
    // force predictable height via parameter count — estimateBlockCardHeight uses structure
  }
}

describe('applyBlockOrganizationToScene', () => {
  const scene: CanvasScene = {
    width: 2000,
    height: 1200,
    nodes: [blockNode('a', 100, 100), blockNode('b', 300, 180), blockNode('c', 520, 140)],
    connections: [],
  }

  it('alinha à esquerda', () => {
    const next = applyBlockOrganizationToScene(scene, ['a', 'b', 'c'], {
      kind: 'align',
      mode: 'left',
    })
    expect(next.nodes.find((node) => node.id === 'a')?.position).toEqual({ x: 100, y: 100 })
    expect(next.nodes.find((node) => node.id === 'b')?.position.x).toBe(100)
    expect(next.nodes.find((node) => node.id === 'c')?.position.x).toBe(100)
  })

  it('distribui horizontalmente por centros com 3+ blocos', () => {
    const next = applyBlockOrganizationToScene(scene, ['a', 'b', 'c'], {
      kind: 'distribute',
      mode: 'centerHorizontal',
    })
    const xs = ['a', 'b', 'c'].map((id) => next.nodes.find((node) => node.id === id)!.position.x)
    expect(xs[0]).toBeLessThan(xs[1]!)
    expect(xs[1]).toBeLessThan(xs[2]!)
  })

  it('ignora distribuir com menos de 3 blocos', () => {
    const next = applyBlockOrganizationToScene(scene, ['a', 'b'], {
      kind: 'distribute',
      mode: 'left',
    })
    expect(next).toBe(scene)
  })
})
