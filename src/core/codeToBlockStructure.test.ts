import { describe, expect, it } from 'vitest'

import type { CanvasNode, CanvasScene } from './canvasScene'
import { hydrateCanvasNodeBlockView } from './codeToBlockStructure'
import type { BlockStructurePayload } from './blockSchema'

function makeScene(canvasNode: CanvasNode): CanvasScene {
  return {
    width: 1120,
    height: 760,
    nodes: [canvasNode],
    connections: [],
  }
}

describe('codeToBlockStructure', () => {
  it('hydrates block view from persisted blockStructure', () => {
    const structure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [],
      identification_codes: [],
    }
    const node: CanvasNode = {
      id: 'n1',
      position: { x: 0, y: 0 },
      blockStructure: structure,
      blockViewActive: true,
      node: {
        id: 'n1',
        schema: { id: 's1', title: 'VfxEmitterDefinitionData', parameters: [], internalStructures: [] },
        values: [],
      },
    }
    const scene = makeScene(node)
    const hydrated = hydrateCanvasNodeBlockView(scene, node)
    expect(hydrated.blockStructure).toEqual(structure)
    expect(hydrated.blockViewActive).toBe(true)
  })
})
