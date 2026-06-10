import { describe, expect, it } from 'vitest'

import type { BlockStructurePayload } from './blockSchema'
import {
  catalogParametersForBlockType,
  findMatchingBlockParameterForLabelEntry,
  listBlockTypeOptionsForLabelPicker,
  listLinkableBlockNodesForCatalogType,
  listParameterIdsReservedBySiblingLabels,
  remapLabelParametersForBlockStructure,
} from './labelParentLinking'

describe('labelParentLinking', () => {
  it('lista tipos de bloco pelo blockName (pasta em parameters/)', () => {
    const options = listBlockTypeOptionsForLabelPicker()
    const emitter = options.find((entry) => entry.label === 'VfxEmitterDefinitionData')
    expect(emitter?.blockType).toBe('VfxEmitterDefinitionData')
  })

  it('expõe parâmetros do catálogo para VfxEmitterDefinitionData', () => {
    const params = catalogParametersForBlockType('VfxEmitterDefinitionData')
    expect(params.length).toBeGreaterThan(10)
    expect(params.some((entry) => entry.idParameter === 'emitterName_emitterName')).toBe(true)
    expect(params.some((entry) => entry.nameParameter === 'emitterName')).toBe(true)
  })

  it('filtra blocos vinculáveis pelo tipo de catálogo', () => {
    const scene = {
      nodes: [
        {
          id: 'block-emitter',
          blockViewActive: true,
          blockStructure: {
            blockType: 'VfxEmitterDefinitionData',
            blockName: 'circulo',
            parameters: [],
            identification_codes: [],
          },
        },
        {
          id: 'block-system',
          blockViewActive: true,
          blockStructure: {
            blockType: 'VfxSystemDefinitionData',
            blockName: 'main',
            parameters: [],
            identification_codes: [],
          },
        },
      ],
      connections: [],
    } as import('./canvasScene').CanvasScene

    const matches = listLinkableBlockNodesForCatalogType(scene, 'VfxEmitterDefinitionData')
    expect(matches.map((node) => node.id)).toEqual(['block-emitter'])
  })

  it('associa parâmetro da label ao existente no bloco pelo nome ritual', () => {
    const structure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'circulo',
      parameters: [
        {
          idParameter: 'emitterName_emitterName',
          nameParameter: 'emitterName',
          typeParameter: 'string',
          defaultValue: 'test',
          sourcePath: {
            kind: 'parameter',
            parameterId:
              'vfx-emitter-definition-data__instance_parameter_emitterName',
          },
        },
      ],
      identification_codes: [],
    }

    const matched = findMatchingBlockParameterForLabelEntry(
      structure,
      'emitterName_emitterName',
    )
    expect(matched?.idParameter).toBe('emitterName_emitterName')

    const remapped = remapLabelParametersForBlockStructure(structure, [
      { parameterId: 'emitterName_emitterName' },
    ])
    expect(remapped[0]?.parameterId).toBe('emitterName_emitterName')
  })

  it('lista parâmetros reservados por outras labels do mesmo bloco pai', () => {
    const parentStructure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'circulo',
      parameters: [
        {
          idParameter: 'emitterName_emitterName',
          nameParameter: 'emitterName',
          typeParameter: 'string',
          defaultValue: 'test',
          sourcePath: {
            kind: 'parameter',
            parameterId: 'vfx-emitter-definition-data__instance_parameter_emitterName',
          },
        },
        {
          idParameter: 'bindWeight_bindWeight',
          nameParameter: 'bindWeight',
          typeParameter: 'f32',
          defaultValue: '0',
          sourcePath: {
            kind: 'parameter',
            parameterId: 'vfx-emitter-definition-data__instance_parameter_bindWeight',
          },
        },
      ],
      identification_codes: [],
    }

    const scene = {
      nodes: [
        {
          id: 'block-emitter',
          blockViewActive: true,
          blockStructure: parentStructure,
        },
        {
          id: 'label-a',
          labelViewActive: true,
          labelStructure: {
            labelName: 'Teste',
            color: '#f5d000',
            parentBlockNodeId: 'block-emitter',
            parameters: [{ parameterId: 'emitterName_emitterName' }],
          },
        },
        {
          id: 'label-b',
          labelViewActive: true,
          labelStructure: {
            labelName: 'Outra',
            color: '#ff0000',
            parentBlockNodeId: 'block-emitter',
            parameters: [{ parameterId: 'bindWeight_bindWeight' }],
          },
        },
      ],
      connections: [],
    } as import('./canvasScene').CanvasScene

    const reserved = listParameterIdsReservedBySiblingLabels(
      scene,
      'block-emitter',
      parentStructure,
    )
    expect(reserved.sort()).toEqual(['bindWeight_bindWeight', 'emitterName_emitterName'].sort())

    const reservedForEdit = listParameterIdsReservedBySiblingLabels(
      scene,
      'block-emitter',
      parentStructure,
      'label-a',
    )
    expect(reservedForEdit).toEqual(['bindWeight_bindWeight'])
  })
})
