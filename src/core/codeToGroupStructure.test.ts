import { describe, expect, it } from 'vitest'

import type { CanvasNode, CanvasScene } from './canvasScene'
import { hydrateCanvasNodeGroupView } from './codeToGroupStructure'
import type { GroupStructurePayload } from './groupSchema'

function makeScene(canvasNode: CanvasNode): CanvasScene {
  return {
    width: 1120,
    height: 760,
    nodes: [canvasNode],
    connections: [],
  }
}

describe('codeToGroupStructure', () => {
  it('hydrates group view from persisted groupStructure', () => {
    const structure: GroupStructurePayload = {
      groupType: 'VfxEmitterDefinitionData',
      groupName: 'Emitter',
      parameters: [],
      identification_codes: [],
    }
    const node: CanvasNode = {
      id: 'n1',
      position: { x: 0, y: 0 },
      groupStructure: structure,
      groupViewActive: true,
      node: {
        id: 'n1',
        schema: { id: 's1', title: 'VfxEmitterDefinitionData', parameters: [], internalStructures: [] },
        values: [],
      },
    }
    const scene = makeScene(node)
    const hydrated = hydrateCanvasNodeGroupView(scene, node)
    expect(hydrated.groupStructure).toEqual(structure)
    expect(hydrated.groupViewActive).toBe(true)
  })
})
