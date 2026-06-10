import { describe, expect, it } from 'vitest'

import { createAddonPlaceholderInstance } from '@/core/addonPlaceholderNode'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { addonSlotId } from '@/core/addonSlotConnections'
import { blockHeaderSlotId } from '@/core/blockSchema'
import { makeVfxEmitterCanvasNode } from '@/core/blockTestFixtures'
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

const codeManifest: AddonManifest = {
  id: 'addon-view-code',
  name: 'View Code',
  category: 'Utility',
  drive: 'inputChange',
  get: true,
  set: true,
  data: [{ name: 'code', type: 'code', direction: 'input' }],
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

  it('resolveAddonInputs lê código ritual de header OUT do bloco', () => {
    const blockNode = makeVfxEmitterCanvasNode({
      id: 'block-1',
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'VfxEmitterDefinitionData',
        identification_codes: [],
        parameters: [
          {
            idParameter: 'p-emitter',
            nameParameter: 'emitterName',
            typeParameter: 'string',
            defaultValue: 'Pillar_bk2',
            sourcePath: { kind: 'parameter', parameterId: 'p-emitter' },
          },
        ],
        appearance: {
          color: '#40ff56',
          headerSlots: ['in[complexEmitterDefinitionData]', 'out[VfxEmitterDefinitionDataPreview]'],
        },
      },
    })
    const target = addonNode('addon-1', 'addon-view-code')

    const headerOutSlotId = blockHeaderSlotId('VfxEmitterDefinitionData', 1, 'VfxEmitterDefinitionDataPreview')
    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [blockNode, target],
      connections: [
        {
          id: 'c-header-code',
          fromNodeId: 'block-1',
          fromInternalStructureId: `__block__:${headerOutSlotId}`,
          fromBlockSlotId: headerOutSlotId,
          toNodeId: 'addon-1',
          toAddonSlotId: addonSlotId('code', 'input'),
        },
      ],
    }

    const inputs = resolveAddonInputs(scene, target, codeManifest)
    expect(typeof inputs.code).toBe('string')
    expect(String(inputs.code)).toContain('# Preview: VfxEmitterDefinitionData')
    expect(String(inputs.code)).toContain('emitterName: string = "Pillar_bk2"')
  })
})
