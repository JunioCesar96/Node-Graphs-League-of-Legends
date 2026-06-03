import { describe, expect, it } from 'vitest'

import { createAddonPlaceholderInstance } from '@/core/addonPlaceholderNode'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { addonSlotId } from '@/core/addonSlotConnections'
import { blockParameterSlotId } from '@/core/blockSchema'
import { addParameterToBlockStructure } from '@/core/blockCatalogMutations'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'

import { syncConnectedAddonOutputs } from './addonOutputPropagation'

const paramDoc: BlockParameterJsonDocument = {
  id: 'customName_customName',
  block: 'VfxEmitterDefinitionData',
  parameterName: 'customName',
  name: 'customName',
  source: { kind: 'parameter', parameterId: 'p-customName' },
  type: 'string',
  value: '',
  slots: { in: [{ type: 'string' }], out: [{ type: 'string' }] },
}

describe('addonOutputPropagation', () => {
  it('syncConnectedAddonOutputs actualiza parâmetro de bloco ligado', () => {
    const structure = addParameterToBlockStructure(
      {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'VfxEmitterDefinitionData',
        parameters: [],
        identification_codes: [],
      },
      paramDoc,
    ).structure
    const param = structure.parameters[0]!
    const inputSlotId = blockParameterSlotId(param.idParameter, 'input')

    const addonNode: CanvasNode = {
      id: 'addon-1',
      position: { x: 0, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'addon-a', outputValues: { result: 'hello' } },
      node: createAddonPlaceholderInstance('addon-1'),
    }
    const blockNode: CanvasNode = {
      id: 'block-1',
      position: { x: 300, y: 0 },
      blockViewActive: true,
      blockStructure: structure,
      node: createAddonPlaceholderInstance('block-1'),
    }

    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [addonNode, blockNode],
      connections: [
        {
          id: 'c1',
          fromNodeId: 'addon-1',
          fromInternalStructureId: '__addon__:out',
          toNodeId: 'block-1',
          fromAddonSlotId: addonSlotId('result', 'output'),
          toBlockSlotId: inputSlotId,
          toBlockParameterId: param.idParameter,
          routing: 'flex',
        },
      ],
    }

    const next = syncConnectedAddonOutputs(scene, 'addon-1')
    const updatedBlock = next.nodes.find((n) => n.id === 'block-1')
    const updatedParam = updatedBlock?.blockStructure?.parameters.find(
      (p) => p.idParameter === param.idParameter,
    )
    expect(updatedParam?.defaultValue).toBe('hello')
  })

  it('syncConnectedAddonOutputs resolve paramId a partir do slot quando toBlockParameterId falta', () => {
    const structure = addParameterToBlockStructure(
      {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'VfxEmitterDefinitionData',
        parameters: [],
        identification_codes: [],
      },
      paramDoc,
    ).structure
    const param = structure.parameters[0]!
    const inputSlotId = blockParameterSlotId(param.idParameter, 'input')

    const addonNode: CanvasNode = {
      id: 'addon-1',
      position: { x: 0, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'addon-a', outputValues: { result: 'from-slot' } },
      node: createAddonPlaceholderInstance('addon-1'),
    }
    const blockNode: CanvasNode = {
      id: 'block-1',
      position: { x: 300, y: 0 },
      blockViewActive: true,
      blockStructure: structure,
      node: createAddonPlaceholderInstance('block-1'),
    }

    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [addonNode, blockNode],
      connections: [
        {
          id: 'c1',
          fromNodeId: 'addon-1',
          fromInternalStructureId: '__addon__:out',
          toNodeId: 'block-1',
          fromAddonSlotId: addonSlotId('result', 'output'),
          toBlockSlotId: inputSlotId,
          routing: 'flex',
        },
      ],
    }

    const next = syncConnectedAddonOutputs(scene, 'addon-1')
    const updatedBlock = next.nodes.find((n) => n.id === 'block-1')
    expect(
      updatedBlock?.blockStructure?.parameters.find((p) => p.idParameter === param.idParameter)
        ?.defaultValue,
    ).toBe('from-slot')
  })

  it('syncConnectedAddonOutputs não reescreve bloco se valor igual', () => {
    const structure = addParameterToBlockStructure(
      {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'VfxEmitterDefinitionData',
        parameters: [],
        identification_codes: [],
      },
      paramDoc,
    ).structure
    const param = structure.parameters[0]!
    param.defaultValue = 'hello'
    const inputSlotId = blockParameterSlotId(param.idParameter, 'input')

    const addonNode: CanvasNode = {
      id: 'addon-1',
      position: { x: 0, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'addon-a', outputValues: { result: 'hello' } },
      node: createAddonPlaceholderInstance('addon-1'),
    }
    const blockNode: CanvasNode = {
      id: 'block-1',
      position: { x: 300, y: 0 },
      blockViewActive: true,
      blockStructure: structure,
      node: createAddonPlaceholderInstance('block-1'),
    }

    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [addonNode, blockNode],
      connections: [
        {
          id: 'c1',
          fromNodeId: 'addon-1',
          fromInternalStructureId: '__addon__:out',
          toNodeId: 'block-1',
          fromAddonSlotId: addonSlotId('result', 'output'),
          toBlockSlotId: inputSlotId,
          toBlockParameterId: param.idParameter,
          routing: 'flex',
        },
      ],
    }

    const next = syncConnectedAddonOutputs(scene, 'addon-1')
    expect(next).toBe(scene)
  })
})
