import { describe, expect, it } from 'vitest'

import { registerAddonManifest } from '@/blockStructures/addonRegistry'
import { createAddonPlaceholderInstance } from '@/core/addonPlaceholderNode'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  addParameterToBlockStructure,
  updateParameterInBlockStructure,
} from '@/core/blockCatalogMutations'
import { blockInspectorEntryFromParameterDef, blockParameterDefFromJsonDocument } from '@/core/blockParameterFromJson'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import { blockParameterSlotId } from '@/core/blockSchema'

import { applyBlockOutputToAddonInput } from './addonBridgeConnections'

const paramWithoutCatalogSlots: BlockParameterJsonDocument = {
  id: 'customName_customName',
  block: 'VfxEmitterDefinitionData',
  parameterName: 'customName',
  name: 'customName',
  source: { kind: 'parameter', parameterId: 'p-customName' },
  type: 'string',
  value: 'Pillar_bk2',
  slots: { in: [], out: [] },
}

describe('addonBridgeConnections', () => {
  it('liga saída de parâmetro editado no inspetor ao add-on', () => {
    registerAddonManifest({
      id: 'addon-string-prefix',
      name: 'String Prefix',
      category: 'Utility',
      drive: 'inputChange',
      get: true,
      set: true,
      data: [
        { name: 'text', type: 'string', direction: 'input' },
        { name: 'result', type: 'string', direction: 'output' },
      ],
    })

    let structure = addParameterToBlockStructure(
      {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'VfxEmitterDefinitionData',
        parameters: [],
        identification_codes: [],
      },
      paramWithoutCatalogSlots,
      { disableSimpleSlotsByDefault: true },
    ).structure

    const param = structure.parameters[0]!
    expect(param.slotRules).toBeUndefined()

    const entry = blockInspectorEntryFromParameterDef(param)
    structure = updateParameterInBlockStructure(structure, param.idParameter, {
      ...entry,
      slotTags: [
        { direction: 'output', type: 'string', active: true },
        { direction: 'input', type: 'string', active: true },
      ],
      slotRules: { outputs: ['string'], inputs: ['string'] },
    })

    const updatedParam = structure.parameters[0]!
    const outputSlotId = blockParameterSlotId(updatedParam.idParameter, 'output')

    const fromNode: CanvasNode = {
      id: 'block-1',
      position: { x: 0, y: 0 },
      blockViewActive: true,
      blockStructure: structure,
      node: createAddonPlaceholderInstance('block-1'),
    }
    const toNode: CanvasNode = {
      id: 'addon-1',
      position: { x: 400, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'addon-string-prefix', outputValues: {} },
      node: createAddonPlaceholderInstance('addon-1'),
    }

    const scene: CanvasScene = {
      nodes: [fromNode, toNode],
      connections: [],
    }

    const next = applyBlockOutputToAddonInput(scene, {
      fromNodeId: 'block-1',
      fromBlockSlotId: outputSlotId,
      fromBlockParameterId: updatedParam.idParameter,
      toNodeId: 'addon-1',
      toAddonSlotId: 'addon:text:input',
    })

    expect(next?.connections).toHaveLength(1)
    expect(next?.connections[0]?.fromBlockSlotId).toBe(outputSlotId)
    expect(next?.connections[0]?.toAddonSlotId).toBe('addon:text:input')
    expect(next?.connections[0]?.routing).toBe('flex')
  })
})
