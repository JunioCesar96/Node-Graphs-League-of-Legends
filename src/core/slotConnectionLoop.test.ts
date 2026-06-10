import { describe, expect, it } from 'vitest'

import type { CanvasScene } from '@/core/canvasScene'
import { wouldCreateSlotConnectionLoop } from '@/core/slotConnectionLoop'

describe('wouldCreateSlotConnectionLoop', () => {
  it('detects a loop when the target node already feeds the source node', () => {
    const scene: CanvasScene = {
      nodes: [],
      connections: [
        {
          id: 'conn-1',
          fromNodeId: 'emitter',
          fromInternalStructureId: '',
          toNodeId: 'prefix',
          fromBlockSlotId: 'block-param:emitterName:output',
          toAddonSlotId: 'addon-slot:Text:input',
        },
      ],
    }

    expect(
      wouldCreateSlotConnectionLoop(scene, 'prefix', 'emitter'),
    ).toBe(true)
  })

  it('allows a connection that does not close a cycle', () => {
    const scene: CanvasScene = {
      nodes: [],
      connections: [
        {
          id: 'conn-1',
          fromNodeId: 'emitter',
          fromInternalStructureId: '',
          toNodeId: 'prefix',
          fromBlockSlotId: 'block-param:emitterName:output',
          toAddonSlotId: 'addon-slot:Text:input',
        },
      ],
    }

    expect(
      wouldCreateSlotConnectionLoop(scene, 'emitter', 'other'),
    ).toBe(false)
  })

  it('detects loops in a longer chain A → B → C → A', () => {
    const scene: CanvasScene = {
      nodes: [],
      connections: [
        {
          id: 'conn-1',
          fromNodeId: 'a',
          fromInternalStructureId: '',
          toNodeId: 'b',
          fromBlockSlotId: 'block-param:outA:output',
          toBlockSlotId: 'block-param:inB:input',
        },
        {
          id: 'conn-2',
          fromNodeId: 'b',
          fromInternalStructureId: '',
          toNodeId: 'c',
          fromAddonSlotId: 'addon-slot:Result:output',
          toAddonSlotId: 'addon-slot:Text:input',
        },
      ],
    }

    expect(wouldCreateSlotConnectionLoop(scene, 'c', 'a')).toBe(true)
  })
})
