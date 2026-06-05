import { describe, expect, it } from 'vitest'

import type { CanvasConnection, CanvasScene } from '@/core/canvasScene'
import { blockParameterSlotId } from '@/core/blockSchema'
import { resolveBlockSlotPeer } from '@/core/blockSlotPeerState'

describe('resolveBlockSlotPeer', () => {
  const outputSlot = blockParameterSlotId('complexEmitterDefinitionData', 'output')
  const inputSlot = blockParameterSlotId('Emitter01', 'input')

  const scene: CanvasScene = {
    width: 1000,
    height: 800,
    nodes: [
      {
        id: 'system',
        position: { x: 0, y: 0 },
        blockViewActive: true,
        blockStructure: {
          blockType: 'VfxSystemDefinitionData',
          blockName: 'System',
          parameters: [],
          identification_codes: [],
        },
        node: { schema: { id: 'sys', title: 'VfxSystemDefinitionData', parameters: [] }, values: [] },
      },
      {
        id: 'emitter',
        position: { x: 400, y: 0 },
        blockViewActive: true,
        blockStructure: {
          blockType: 'VfxEmitterDefinitionData',
          blockName: 'Emitter',
          parameters: [],
          identification_codes: [],
        },
        node: { schema: { id: 'em', title: 'VfxEmitterDefinitionData', parameters: [] }, values: [] },
      },
    ],
    connections: [
      {
        id: 'block:system->emitter',
        fromNodeId: 'system',
        fromInternalStructureId: `__block__:${outputSlot}`,
        toNodeId: 'emitter',
        routing: 'wireless',
        fromBlockSlotId: outputSlot,
        toBlockSlotId: inputSlot,
      } satisfies CanvasConnection,
    ],
  }

  it('resolve saída do bloco para o nó destino', () => {
    const resolved = resolveBlockSlotPeer(scene, 'system', outputSlot, 'output')
    expect(resolved?.peerNodeId).toBe('emitter')
    expect(resolved?.slotDirection).toBe('output')
  })

  it('resolve entrada do bloco para o nó origem', () => {
    const resolved = resolveBlockSlotPeer(scene, 'emitter', inputSlot, 'input')
    expect(resolved?.peerNodeId).toBe('system')
    expect(resolved?.slotDirection).toBe('input')
  })
})
