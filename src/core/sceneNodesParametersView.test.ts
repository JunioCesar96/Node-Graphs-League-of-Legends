import { describe, expect, it } from 'vitest'

import { blockParameterSlotId } from '@/core/blockSchema'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { listEmbedSlotId } from '@/core/listEmbedSlots'
import {
  buildSceneNodesParameterRows,
  formatSceneNodesParameterDisplayValue,
  resolveBlockParameterConnectedDisplayLabel,
  resolveSceneNodesParameterParentNodeId,
  shouldShowSceneNodesParametersPanel,
} from '@/core/sceneNodesParametersView'

function blockNode(
  id: string,
  blockType: string,
  parameters: Array<{ id: string; name: string; value: string; outputType?: string; outputSlotType?: string }>,
): CanvasNode {
  return {
    id,
    position: { x: 0, y: 0 },
    blockViewActive: true,
    blockStructure: {
      blockType,
      blockName: blockType,
      parameters: parameters.map((entry) => ({
        idParameter: entry.id,
        nameParameter: entry.name,
        typeParameter: entry.outputType ? `${entry.outputType}{}` : 'string',
        defaultValue: entry.value,
        sourcePath: { kind: 'parameter', parameterId: entry.id },
        slotRules:
          entry.outputSlotType || entry.outputType
            ? { outputs: [entry.outputSlotType ?? entry.outputType!] }
            : undefined,
      })),
      identification_codes: [],
    },
    node: {
      id: `inst-${id}`,
      schema: { id: blockType, title: blockType, parameters: [], internalStructures: [] },
      values: parameters.map((entry) => ({ parameterId: entry.id, value: entry.value })),
    },
  } as CanvasNode
}

describe('shouldShowSceneNodesParametersPanel', () => {
  it('shows only when exactly one node is selected', () => {
    expect(shouldShowSceneNodesParametersPanel(0)).toBe(false)
    expect(shouldShowSceneNodesParametersPanel(1)).toBe(true)
    expect(shouldShowSceneNodesParametersPanel(2)).toBe(false)
  })
})

describe('formatSceneNodesParameterDisplayValue', () => {
  it('formats scalar block token values', () => {
    expect(
      formatSceneNodesParameterDisplayValue(
        '_blockType&ValueFloat_blockName&ValueFloat_idParameter&constantValue_constantValue_nameParameter&constantValue_typeParameter&f32{1.5}_endParameter',
      ),
    ).toBe('1.5')
  })

  it('formats nested block token values as block type', () => {
    expect(
      formatSceneNodesParameterDisplayValue(
        '_blockType&VfxEmitterDefinitionData_blockName&VfxEmitterDefinitionData_idParameter&bindWeight_bindWeight_embed_ValueFloat_nameParameter&bindWeight_typeParameter&ValueFloat{}_slotParameter&output[ValueFloat]_endParameter',
      ),
    ).toBe('ValueFloat')
  })
})

describe('resolveSceneNodesParameterParentNodeId', () => {
  it('returns the upstream block that links into the current node', () => {
    const parent = blockNode('parent', 'VfxEmitterDefinitionData', [
      {
        id: 'birthColor',
        name: 'birthColor',
        value: 'token',
        outputType: 'ValueColor',
      },
    ])
    const child = blockNode('child', 'ValueColor', [
      { id: 'constantValue', name: 'constantValue', value: 'token' },
    ])

    const scene: CanvasScene = {
      nodes: [parent, child],
      connections: [
        {
          id: 'conn-1',
          fromNodeId: 'parent',
          fromInternalStructureId: '',
          toNodeId: 'child',
          fromBlockSlotId: 'block-param:birthColor:output',
          toBlockSlotId: 'block-param:constantValue:input',
        },
      ],
    }

    expect(resolveSceneNodesParameterParentNodeId(scene, 'child')).toBe('parent')
    expect(resolveSceneNodesParameterParentNodeId(scene, 'parent')).toBeUndefined()
  })
})

describe('buildSceneNodesParameterRows', () => {
  it('marks nested block parameters as navigable when a child is connected', () => {
    const parent = blockNode('parent', 'VfxEmitterDefinitionData', [
      { id: 'alphaRef', name: 'alphaRef', value: '_blockType&...&u8{0}_endParameter' },
      {
        id: 'bindWeight',
        name: 'bindWeight',
        value:
          '_blockType&VfxEmitterDefinitionData_blockName&VfxEmitterDefinitionData_idParameter&bindWeight_bindWeight_embed_ValueFloat_nameParameter&bindWeight_typeParameter&ValueFloat{}_slotParameter&output[ValueFloat]_endParameter',
        outputType: 'ValueFloat',
      },
    ])
    const child = blockNode('child', 'ValueFloat', [
      { id: 'constantValue', name: 'constantValue', value: '_blockType&...&f32{2}_endParameter' },
    ])

    const scene: CanvasScene = {
      nodes: [parent, child],
      connections: [
        {
          id: 'conn-1',
          fromNodeId: 'parent',
          fromInternalStructureId: '',
          toNodeId: 'child',
          fromBlockSlotId: 'block-param:bindWeight:output',
          toBlockSlotId: 'block-param:constantValue:input',
        },
      ],
    }

    const rows = buildSceneNodesParameterRows(scene, parent)
    const bindWeight = rows.find((row) => row.id === 'bindWeight')

    expect(bindWeight?.navigable).toBe(true)
    expect(bindWeight?.editable).toBe(false)
    expect(bindWeight?.childNodeId).toBe('child')

    const alphaRef = rows.find((row) => row.id === 'alphaRef')
    expect(alphaRef?.navigable).toBe(false)
    expect(alphaRef?.editable).toBe(true)
    expect(alphaRef?.kind).toBe('block')
  })

  it('keeps scalar output parameters editable when connected to a peer input slot', () => {
    const emitter = blockNode('emitter', 'VfxEmitterDefinitionData', [
      {
        id: 'emitterName',
        name: 'emitterName',
        value:
          '_blockType&VfxEmitterDefinitionData_blockName&VfxEmitterDefinitionData_idParameter&emitterName_emitterName_nameParameter&emitterName_typeParameter&string{"ddddd"}_slotParameter&output[string]_endParameter',
        outputSlotType: 'string',
      },
    ])
    const prefix = {
      id: 'prefix',
      position: { x: 0, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'addon-string-prefix', outputValues: {} },
      node: {
        id: 'inst-prefix',
        schema: { id: 'addon', title: 'String Prefix', parameters: [], internalStructures: [] },
        values: [],
      },
    } as CanvasNode

    const scene: CanvasScene = {
      nodes: [emitter, prefix],
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

    const rows = buildSceneNodesParameterRows(scene, emitter)
    const emitterName = rows.find((row) => row.id === 'emitterName')

    expect(emitterName?.navigable).toBe(true)
    expect(emitterName?.editable).toBe(true)
    expect(emitterName?.childNodeId).toBe('prefix')
  })

  it('mostra o nome do bloco ligado em vez de — para parâmetros estruturais vazios', () => {
    const birthColorId = 'birthColor'
    const indexedSlot = listEmbedSlotId(birthColorId, 0)

    const parent: CanvasNode = {
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

    const child: CanvasNode = {
      id: 'value-color',
      position: { x: 0, y: 0 },
      blockViewActive: true,
      blockStructure: {
        blockType: 'ValueColor',
        blockName: 'ValueColor',
        parameters: [],
        identification_codes: [],
        appearance: {
          color: '#40ff56',
          headerSlots: ['in[birthColor]', 'out[ValueColorPreview]'],
          parentBlockField: 'birthColor',
        },
      },
      node: {
        id: 'inst-value-color',
        schema: {
          id: 'ValueColor',
          title: 'ValueColor',
          parameters: [],
          internalStructures: [],
        },
        values: [],
      },
    }

    const scene: CanvasScene = {
      nodes: [parent, child],
      connections: [
        {
          id: 'conn-1',
          fromNodeId: 'emitter',
          fromInternalStructureId: `__block__:${indexedSlot}`,
          toNodeId: 'value-color',
          fromBlockSlotId: indexedSlot,
          fromBlockParameterId: birthColorId,
          toBlockSlotId: 'block-header:ValueColor:0:birthColor',
        },
      ],
    }

    expect(resolveBlockParameterConnectedDisplayLabel(scene, parent, birthColorId)).toBe('ValueColor')

    const rows = buildSceneNodesParameterRows(scene, parent)
    const birthColor = rows.find((row) => row.id === birthColorId)

    expect(birthColor?.displayValue).toBe('ValueColor')
    expect(birthColor?.navigable).toBe(true)
    expect(birthColor?.childNodeId).toBe('value-color')
  })

  it('inclui listEmbed e pointer do schema quando o nó está em vista de grafo', () => {
    const listEmbedId = 'VfxEmitterDefinitionData_listEmbed_birthColor'
    const listEmbedSlot = `${listEmbedId}__slot__0`
    const pointerId = 'ValueColor_pointer_dynamics'
    const pointerSlot = `${pointerId}__slot__0`

    const emitter: CanvasNode = {
      id: 'emitter',
      position: { x: 0, y: 0 },
      blockViewActive: false,
      node: {
        id: 'inst-emitter',
        schema: {
          id: 'vfx-emitter-definition-data',
          title: 'VfxEmitterDefinitionData',
          parameters: [
            {
              id: 'vfx-emitter-definition-data_parameter_alphaRef',
              name: 'alphaRef',
              type: 'u8',
              defaultValue: '0',
            },
            {
              id: 'vfx-emitter-definition-data_parameter_emitterName',
              name: 'emitterName',
              type: 'string',
              defaultValue: 'Pillar_bk2',
            },
          ],
          internalStructures: [],
          listEmbed: [
            {
              id: listEmbedId,
              title: 'birthColor',
              internalStructures: [
                {
                  id: 'birth-color-0',
                  name: 'ValueColor',
                  schemaId: 'value-color-0',
                },
              ],
              slots: [
                {
                  id: listEmbedSlot,
                  name: 'ValueColor',
                  schemaId: 'value-color-0',
                },
              ],
            },
          ],
        },
        values: [],
      },
    }

    const valueColor: CanvasNode = {
      id: 'value-color',
      position: { x: 0, y: 0 },
      blockViewActive: false,
      node: {
        id: 'inst-value-color',
        schema: {
          id: 'value-color-0',
          title: 'ValueColor',
          parameters: [
            {
              id: 'value-color_parameter_constantValue',
              name: 'constantValue',
              type: 'vector4',
              defaultValue: '0.282, 0.163, 0.156, 1',
            },
          ],
          internalStructures: [],
          pointer: [
            {
              id: pointerId,
              title: 'dynamics',
              internalStructures: [
                {
                  id: 'dynamics-0',
                  name: 'VfxAnimatedColorVariableData',
                  schemaId: 'animated-0',
                },
              ],
              slots: [
                {
                  id: pointerSlot,
                  name: 'VfxAnimatedColorVariableData',
                  schemaId: 'animated-0',
                },
              ],
            },
          ],
        },
        values: [],
      },
    }

    const animated: CanvasNode = {
      id: 'animated',
      position: { x: 0, y: 0 },
      blockViewActive: false,
      node: {
        id: 'inst-animated',
        schema: {
          id: 'animated-0',
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
          fromInternalStructureId: listEmbedSlot,
          toNodeId: 'value-color',
        },
        {
          id: 'conn-dynamics',
          fromNodeId: 'value-color',
          fromInternalStructureId: pointerSlot,
          toNodeId: 'animated',
        },
      ],
    }

    const emitterRows = buildSceneNodesParameterRows(scene, emitter)
    expect(emitterRows.map((row) => row.name)).toEqual(['alphaRef', 'emitterName', 'birthColor'])
    expect(emitterRows.find((row) => row.name === 'birthColor')?.navigable).toBe(true)
    expect(emitterRows.find((row) => row.name === 'birthColor')?.childNodeId).toBe('value-color')

    const valueColorRows = buildSceneNodesParameterRows(scene, valueColor)
    expect(valueColorRows.map((row) => row.name)).toEqual(['constantValue', 'dynamics'])
    expect(valueColorRows.find((row) => row.name === 'dynamics')?.navigable).toBe(true)
    expect(valueColorRows.find((row) => row.name === 'dynamics')?.childNodeId).toBe('animated')
  })
})
