import { describe, expect, it } from 'vitest'

import { createAddonPlaceholderInstance } from '@/core/addonPlaceholderNode'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { addonSlotId } from '@/core/addonSlotConnections'
import type { AddonManifest } from '@/services/addonLoader.service'

import { applyAddonOutputs, resolveAddonInputs } from './instanceEvaluator'

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

describe('instanceEvaluator', () => {
  it('resolveAddonInputs lê saída de add-on upstream pelo slot de output', () => {
    const target = addonNode('target', 'addon-a')
    const source = addonNode('source', 'addon-a', { result: 'hello' })

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

    const inputs = resolveAddonInputs(scene, target, manifest)
    expect(inputs.text).toBe('hello')
  })

  it('resolveAddonInputs omite slots sem ligação', () => {
    const target = addonNode('target', 'addon-a')
    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [target],
      connections: [],
    }

    expect(resolveAddonInputs(scene, target, manifest)).toEqual({})
  })

  it('applyAddonOutputs grava cache de saídas', () => {
    const node = addonNode('n1', 'addon-a')
    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [node],
      connections: [],
    }

    const next = applyAddonOutputs(scene, 'n1', { result: 'done' })
    const updated = next.nodes.find((n) => n.id === 'n1')
    expect(updated?.addonInstance?.outputValues.result).toBe('done')
  })
})
