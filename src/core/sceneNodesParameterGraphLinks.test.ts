import { describe, expect, it } from 'vitest'

import { blockParameterSlotId } from '@/core/blockSchema'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { listEmbedSlotId } from '@/core/listEmbedSlots'
import {
  buildOutgoingLinksIndex,
  formatOutgoingLinksDisplayLabel,
  resolveSceneNodesParameterParentNodeId,
} from '@/core/sceneNodesParameterGraphLinks'
import { buildSceneNodesParameterRows } from '@/core/sceneNodesParametersView'

describe('sceneNodesParameterGraphLinks', () => {
  it('indexa ligações list[embed] e pointer do grafo de blocos', () => {
    const birthColorId = 'birthColor'
    const dynamicsId = 'dynamics'
    const indexedSlot = listEmbedSlotId(birthColorId, 0)

    const emitter: CanvasNode = {
      id: 'emitter',
      position: { x: 0, y: 0 },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'VfxEmitterDefinitionData',
        parameters: [
          {
            idParameter: birthColorId,
            nameParameter: 'birthColor',
            typeParameter: 'ValueColor{}',
            defaultValue: '',
            listParameter: true,
            slotRules: { outputs: ['ValueColor'] },
            sourcePath: {
              kind: 'embedChild',
              embedId: 'leb-1',
              slotId: indexedSlot,
              childParameterId: 'child-1',
            },
          },
        ],
        identification_codes: [],
      },
      node: {
        id: 'inst-emitter',
        schema: {
          id: 'VfxEmitterDefinitionData',
          title: 'VfxEmitterDefinitionData',
          parameters: [],
          internalStructures: [],
        },
        values: [],
      },
    }

    const valueColor: CanvasNode = {
      id: 'value-color',
      position: { x: 0, y: 0 },
      blockViewActive: true,
      blockStructure: {
        blockType: 'ValueColor',
        blockName: 'ValueColor',
        parameters: [
          {
            idParameter: dynamicsId,
            nameParameter: 'dynamics',
            typeParameter: 'VfxAnimatedColorVariableData',
            defaultValue: '',
            slotRules: { outputs: ['VfxAnimatedColorVariableData'] },
            sourcePath: {
              kind: 'pointerChild',
              pointerId: 'ptr-1',
              slotId: 'ptr-slot',
            },
          },
        ],
        identification_codes: [],
        appearance: {
          color: '#40ff56',
          headerSlots: ['in[birthColor]', 'out[ValueColorPreview]'],
          parentBlockField: 'birthColor',
        },
      },
      node: {
        id: 'inst-value-color',
        schema: { id: 'ValueColor', title: 'ValueColor', parameters: [], internalStructures: [] },
        values: [],
      },
    }

    const animated: CanvasNode = {
      id: 'animated',
      position: { x: 0, y: 0 },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxAnimatedColorVariableData',
        blockName: 'VfxAnimatedColorVariableData',
        parameters: [],
        identification_codes: [],
        appearance: {
          color: '#40ff56',
          headerSlots: ['in[dynamics]', 'out[VfxAnimatedColorVariableDataPreview]'],
          parentBlockField: 'dynamics',
        },
      },
      node: {
        id: 'inst-animated',
        schema: {
          id: 'VfxAnimatedColorVariableData',
          title: 'VfxAnimatedColorVariableData',
          parameters: [],
          internalStructures: [],
        },
        values: [],
      },
    }

    const scene: CanvasScene = {
      nodes: [emitter, valueColor, animated],
      connections: [
        {
          id: 'conn-birth',
          fromNodeId: 'emitter',
          fromInternalStructureId: `__block__:${indexedSlot}`,
          toNodeId: 'value-color',
          fromBlockSlotId: indexedSlot,
          fromBlockParameterId: birthColorId,
          toBlockSlotId: 'block-header:ValueColor:0:birthColor',
        },
        {
          id: 'conn-dynamics',
          fromNodeId: 'value-color',
          fromInternalStructureId: `__block__:${blockParameterSlotId(dynamicsId, 'output')}`,
          toNodeId: 'animated',
          fromBlockSlotId: blockParameterSlotId(dynamicsId, 'output'),
          fromBlockParameterId: dynamicsId,
          toBlockSlotId: 'block-header:VfxAnimatedColorVariableData:0:dynamics',
        },
      ],
    }

    const emitterIndex = buildOutgoingLinksIndex(scene, emitter)
    expect(emitterIndex.get('birthcolor')).toHaveLength(1)
    expect(formatOutgoingLinksDisplayLabel(scene, emitterIndex.get('birthcolor') ?? [])).toBe(
      'ValueColor',
    )

    const valueColorIndex = buildOutgoingLinksIndex(scene, valueColor)
    expect(formatOutgoingLinksDisplayLabel(scene, valueColorIndex.get('dynamics') ?? [])).toBe(
      'VfxAnimatedColorVariableData',
    )

    expect(resolveSceneNodesParameterParentNodeId(scene, 'value-color')).toBe('emitter')
    expect(resolveSceneNodesParameterParentNodeId(scene, 'animated')).toBe('value-color')

    const emitterRows = buildSceneNodesParameterRows(scene, emitter)
    expect(emitterRows.find((row) => row.name === 'birthColor')?.displayValue).toBe('ValueColor')
    expect(emitterRows.find((row) => row.name === 'birthColor')?.navigable).toBe(true)

    const valueColorRows = buildSceneNodesParameterRows(scene, valueColor)
    expect(valueColorRows.find((row) => row.name === 'dynamics')?.displayValue).toBe(
      'VfxAnimatedColorVariableData',
    )
    expect(valueColorRows.find((row) => row.name === 'dynamics')?.navigable).toBe(true)
  })
})
