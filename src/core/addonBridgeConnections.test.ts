import { describe, expect, it } from 'vitest'

import { registerAddonManifest } from '@/blockStructures/addonRegistry'
import { createAddonPlaceholderInstance } from '@/core/addonPlaceholderNode'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  addParameterToBlockStructure,
  updateParameterInBlockStructure,
} from '@/core/blockCatalogMutations'
import { blockInspectorEntryFromParameterDef } from '@/core/blockParameterFromJson'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import { blockParameterSlotId } from '@/core/blockSchema'

import { applyAddonOutputToBlockInput, applyBlockOutputToAddonInput } from './addonBridgeConnections'

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

  it('substitui ligação anterior quando a mesma saída de bloco liga a outro add-on', () => {
    registerAddonManifest({
      id: 'addon-string-prefix-2',
      name: 'String Prefix 2',
      category: 'Utility',
      drive: 'inputChange',
      get: true,
      set: true,
      data: [{ name: 'text', type: 'string', direction: 'input' }],
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
    structure = updateParameterInBlockStructure(structure, param.idParameter, {
      ...blockInspectorEntryFromParameterDef(param),
      slotTags: [{ direction: 'output', type: 'string', active: true }],
      slotRules: { outputs: ['string'], inputs: [] },
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
    const addonA: CanvasNode = {
      id: 'addon-a',
      position: { x: 400, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'addon-string-prefix-2', outputValues: {} },
      node: createAddonPlaceholderInstance('addon-a'),
    }
    const addonB: CanvasNode = {
      id: 'addon-b',
      position: { x: 800, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'addon-string-prefix-2', outputValues: {} },
      node: createAddonPlaceholderInstance('addon-b'),
    }

    const scene: CanvasScene = { nodes: [fromNode, addonA, addonB], connections: [] }
    const first = applyBlockOutputToAddonInput(scene, {
      fromNodeId: 'block-1',
      fromBlockSlotId: outputSlotId,
      fromBlockParameterId: updatedParam.idParameter,
      toNodeId: 'addon-a',
      toAddonSlotId: 'addon:text:input',
    })
    const second = applyBlockOutputToAddonInput(first!, {
      fromNodeId: 'block-1',
      fromBlockSlotId: outputSlotId,
      fromBlockParameterId: updatedParam.idParameter,
      toNodeId: 'addon-b',
      toAddonSlotId: 'addon:text:input',
    })

    expect(second?.connections).toHaveLength(1)
    expect(second?.connections[0]?.toNodeId).toBe('addon-b')
  })

  it('permite várias ligações a partir da mesma saída de add-on (plugin)', () => {
    registerAddonManifest({
      id: 'addon-fanout',
      name: 'Fanout',
      category: 'Utility',
      drive: 'inputChange',
      get: true,
      set: true,
      data: [{ name: 'result', type: 'string', direction: 'output' }],
    })

    const makeStringInputBlock = (nodeId: string): { node: CanvasNode; inputSlotId: string; paramId: string } => {
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
      structure = updateParameterInBlockStructure(structure, param.idParameter, {
        ...blockInspectorEntryFromParameterDef(param),
        slotTags: [{ direction: 'input', type: 'string', active: true }],
        slotRules: { inputs: ['string'], outputs: [] },
      })
      const updatedParam = structure.parameters[0]!
      return {
        paramId: updatedParam.idParameter,
        inputSlotId: blockParameterSlotId(updatedParam.idParameter, 'input'),
        node: {
          id: nodeId,
          position: { x: 0, y: 0 },
          blockViewActive: true,
          blockStructure: structure,
          node: createAddonPlaceholderInstance(nodeId),
        },
      }
    }

    const blockA = makeStringInputBlock('block-a')
    const blockB = makeStringInputBlock('block-b')
    const addonNode: CanvasNode = {
      id: 'addon-1',
      position: { x: 0, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'addon-fanout', outputValues: { result: 'x' } },
      node: createAddonPlaceholderInstance('addon-1'),
    }

    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [addonNode, blockA.node, blockB.node],
      connections: [],
    }

    const afterFirst = applyAddonOutputToBlockInput(scene, {
      fromNodeId: 'addon-1',
      fromAddonSlotId: 'addon:result:output',
      toNodeId: 'block-a',
      toBlockSlotId: blockA.inputSlotId,
      toBlockParameterId: blockA.paramId,
    })
    expect(afterFirst).not.toBeNull()

    const afterSecond = applyAddonOutputToBlockInput(afterFirst!, {
      fromNodeId: 'addon-1',
      fromAddonSlotId: 'addon:result:output',
      toNodeId: 'block-b',
      toBlockSlotId: blockB.inputSlotId,
      toBlockParameterId: blockB.paramId,
    })

    expect(afterSecond?.connections).toHaveLength(2)
    expect(afterSecond?.connections.map((connection) => connection.toNodeId).sort()).toEqual([
      'block-a',
      'block-b',
    ])
  })
})
