import { describe, expect, it } from 'vitest'

import { createAddonPlaceholderInstance } from '@/core/addonPlaceholderNode'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { addonSlotId } from '@/core/addonSlotConnections'
import type { AddonManifest } from '@/services/addonLoader.service'

import { buildAddonWiredInputsFeedKey } from './addonInputFeed'

const manifest: AddonManifest = {
  id: 'addon-a',
  name: 'A',
  category: 'Utility',
  drive: 'inputChange',
  get: true,
  set: true,
  data: [
    { name: 'text', type: 'string', direction: 'input' },
    { name: 'result', type: 'string', direction: 'output' },
  ],
}

function addonNode(id: string, addonId: string, outputs: Record<string, unknown> = {}): CanvasNode {
  return {
    id,
    position: { x: 0, y: 0 },
    addonViewActive: true,
    addonInstance: { addonId, outputValues: outputs },
    node: createAddonPlaceholderInstance(id),
  }
}

describe('addonInputFeed', () => {
  it('buildAddonWiredInputsFeedKey muda quando upstream altera output', () => {
    const target = addonNode('target', 'addon-a')
    const source = addonNode('source', 'addon-a', { result: 'v1' })
    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [source, target],
      connections: [
        {
          id: 'c1',
          fromNodeId: 'source',
          fromInternalStructureId: '__addon__:out',
          toNodeId: 'target',
          fromAddonSlotId: addonSlotId('result', 'output'),
          toAddonSlotId: addonSlotId('text', 'input'),
        },
      ],
    }

    expect(buildAddonWiredInputsFeedKey(scene, target, manifest)).toBe('text:"v1"')

    const nextSource = addonNode('source', 'addon-a', { result: 'v2' })
    const nextScene: CanvasScene = { ...scene, nodes: [nextSource, target] }
    expect(buildAddonWiredInputsFeedKey(nextScene, target, manifest)).toBe('text:"v2"')
  })
})
