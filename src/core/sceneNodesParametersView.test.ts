import { describe, expect, it } from 'vitest'

import { registerInputAddonManifest } from '@/blockStructures/inputAddonRegistry'
import { blockParameterSlotId } from '@/core/blockSchema'
import {
  blockElementViewKeyForParameter,
  blockElementViewKeyForSlot,
} from '@/core/blockElementViewState'
import { formatMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { listEmbedSlotId } from '@/core/listEmbedSlots'
import { listPointerSlotId } from '@/core/listPointerSlots'
import {
  buildSceneNodesParameterRows,
  formatSceneNodesParameterDisplayValue,
  resolveBlockParameterConnectedDisplayLabel,
  resolveSceneNodesParameterParentNodeId,
  resolveSceneNodesParameterRowAtListIndex,
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

  it('enriquece linhas editáveis com input add-ons compatíveis', () => {
    registerInputAddonManifest({
      id: 'input-addon-color-vec4',
      type: 'input',
      name: 'Cor Vec4',
      category: 'Values',
      input: {
        block: 'ValueColor',
        parameter: 'constantValue',
        type: 'vec4',
        change: 'inputaddon',
      },
    })

    const valueColor: CanvasNode = {
      id: 'value-color',
      position: { x: 0, y: 0 },
      blockViewActive: true,
      blockStructure: {
        blockType: 'ValueColor',
        blockName: 'ValueColor',
        parameters: [
          {
            idParameter: 'constantValue',
            nameParameter: 'constantValue',
            typeParameter: 'vec4',
            defaultValue: '0, 0, 0, 1',
            sourcePath: { kind: 'parameter', parameterId: 'constantValue' },
          },
        ],
        identification_codes: [],
      },
      node: {
        id: 'inst-value-color',
        schema: { id: 'ValueColor', title: 'ValueColor', parameters: [], internalStructures: [] },
        values: [{ parameterId: 'constantValue', value: '0, 0, 0, 1' }],
      },
    } as CanvasNode

    const rows = buildSceneNodesParameterRows({ nodes: [valueColor], connections: [] }, valueColor)
    const constantValueRow = rows.find((row) => row.name === 'constantValue')
    expect(constantValueRow?.inputAddonMatches?.map((manifest) => manifest.id)).toContain(
      'input-addon-color-vec4',
    )
    expect(constantValueRow?.activeInputAddonId).toBe('input-addon-color-vec4')
  })

  it('expõe índice de lista para parâmetros list[pointer] com várias ligações', () => {
    const listParamId = 'complexEmitterDefinitionData_list_pointer'
    const outputSlot = blockParameterSlotId(listParamId, 'output')

    const parent: CanvasNode = {
      id: 'system',
      position: { x: 0, y: 0 },
      node: {
        id: 'system',
        schema: { id: 'x', title: 'X', parameters: [], internalStructures: [] },
        values: [],
      },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [
          {
            idParameter: listParamId,
            nameParameter: 'complexEmitterDefinitionData',
            typeParameter: 'VfxEmitterDefinitionData',
            defaultValue: '',
            listParameter: true,
            sourcePath: {
              kind: 'pointerChild',
              pointerId: 'catalog-ptr',
              slotId: 'catalog-ptr-slot',
            },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [blockElementViewKeyForSlot(outputSlot)]: { mode: 'list', selectedIndex: 11 },
      },
    }

    const emitters = Array.from({ length: 14 }, (_, index) => ({
      id: `emitter-${index}`,
      position: { x: 400 + index * 40, y: 0 },
      node: {
        id: `emitter-${index}`,
        schema: { id: 'y', title: 'Y', parameters: [], internalStructures: [] },
        values: [],
      },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: `Emitter${index}`,
        parameters: [],
        identification_codes: [],
      },
    })) as CanvasNode[]

    const scene: CanvasScene = {
      nodes: [parent, ...emitters],
      connections: emitters.map((emitter, index) => ({
        id: `c-${index}`,
        fromNodeId: 'system',
        fromInternalStructureId: `__block__:${listPointerSlotId(listParamId, index)}`,
        fromBlockSlotId: listPointerSlotId(listParamId, index),
        toNodeId: emitter.id,
        toBlockSlotId: 'block-header:in:0',
      })),
    }

    const rows = buildSceneNodesParameterRows(scene, parent)
    const listRow = rows.find((row) => row.name === 'complexEmitterDefinitionData')

    expect(listRow?.listIndex?.connectionCount).toBe(14)
    expect(listRow?.listIndex?.connectionIndex).toBe(11)
    expect(listRow?.listIndex?.elementViewKey).toBe(blockElementViewKeyForSlot(outputSlot))
    expect(listRow?.childNodeId).toBe('emitter-11')
    expect(listRow?.displayValue).toBe('Emitter11')

    const atIndex3 = resolveSceneNodesParameterRowAtListIndex(listRow!, scene, 3)
    expect(atIndex3.childNodeId).toBe('emitter-3')
    expect(atIndex3.displayValue).toBe('Emitter3')
    expect(atIndex3.listIndex?.connectionIndex).toBe(3)
  })

  it('expõe índice de lista para parâmetros mapHash (entries)', () => {
    const entriesParamId = 'entries'
    const entriesValue = formatMapHashEmbedString([
      { key: '0x11111111', schemaId: 'vfx-system-a', typeName: 'VfxSystemDefinitionData' },
      { key: '0x22222222', schemaId: 'vfx-system-b', typeName: 'VfxSystemDefinitionData' },
      { key: '0x33333333', schemaId: 'vfx-system-c', typeName: 'VfxSystemDefinitionData' },
    ])

    const parent: CanvasNode = {
      id: 'main',
      position: { x: 0, y: 0 },
      node: {
        id: 'main',
        schema: { id: 'Main', title: 'Main', parameters: [], internalStructures: [] },
        values: [{ parameterId: entriesParamId, value: entriesValue }],
      },
      blockViewActive: true,
      blockStructure: {
        blockType: 'Main',
        blockName: 'Main',
        parameters: [
          {
            idParameter: entriesParamId,
            nameParameter: 'entries',
            typeParameter: 'mapHashEmbed',
            defaultValue: entriesValue,
            sourcePath: { kind: 'parameter', parameterId: entriesParamId },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [blockElementViewKeyForParameter(entriesParamId)]: { mode: 'compact', selectedIndex: 1 },
      },
    }

    const childA: CanvasNode = {
      id: 'vfx-a',
      position: { x: 400, y: 0 },
      node: {
        id: 'vfx-a',
        schema: { id: 'y', title: 'Y', parameters: [], internalStructures: [] },
        values: [],
      },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'Characters/Brand',
        parameters: [],
        identification_codes: [],
      },
    }

    const childB: CanvasNode = {
      id: 'vfx-b',
      position: { x: 800, y: 0 },
      node: {
        id: 'vfx-b',
        schema: { id: 'z', title: 'Z', parameters: [], internalStructures: [] },
        values: [],
      },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'Characters/Lux',
        parameters: [],
        identification_codes: [],
      },
    }

    const scene: CanvasScene = {
      nodes: [parent, childA, childB],
      connections: [
        {
          id: 'c-a',
          fromNodeId: 'main',
          fromBlockSlotId: mapHashEmbedSlotId(entriesParamId, '0x11111111'),
          toNodeId: 'vfx-a',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'c-b',
          fromNodeId: 'main',
          fromBlockSlotId: mapHashEmbedSlotId(entriesParamId, '0x22222222'),
          toNodeId: 'vfx-b',
          toBlockSlotId: 'block-header:in:0',
        },
      ],
    }

    const rows = buildSceneNodesParameterRows(scene, parent)
    const entriesRow = rows.find((row) => row.name === 'entries')

    expect(entriesRow?.listIndex?.connectionCount).toBe(3)
    expect(entriesRow?.listIndex?.connectionIndex).toBe(1)
    expect(entriesRow?.listIndex?.elementViewKey).toBe(
      blockElementViewKeyForParameter(entriesParamId),
    )
    expect(entriesRow?.childNodeId).toBe('vfx-b')
    expect(entriesRow?.displayValue).toBe('Characters/Lux')
    expect(entriesRow?.navigable).toBe(true)
  })
})
