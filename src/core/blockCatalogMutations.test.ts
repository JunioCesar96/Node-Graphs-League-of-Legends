import { describe, expect, it } from 'vitest'

import { addParameterToBlockStructure } from './blockCatalogMutations'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import type { BlockStructurePayload } from './blockSchema'

const baseStructure: BlockStructurePayload = {
  blockType: 'VfxEmitterDefinitionData',
  blockName: 'VfxEmitterDefinitionData',
  parameters: [],
  identification_codes: [],
}

const simpleDoc: BlockParameterJsonDocument = {
  id: 'alphaRef_alphaRef',
  block: 'VfxEmitterDefinitionData',
  parameterName: 'alphaRef',
  name: 'alphaRef',
  source: { kind: 'parameter', parameterId: 'p-alphaRef' },
  type: 'u8',
  value: '0',
  slots: { in: ['u8'], out: ['u8'] },
}

const embedDoc: BlockParameterJsonDocument = {
  id: 'birthScale0_birthScale0_embed_ValueVector3',
  block: 'VfxEmitterDefinitionData',
  parameterName: 'birthScale0',
  name: 'birthScale0',
  source: { kind: 'parameter', parameterId: 'p-birthScale0' },
  type: 'embed',
  embed: 'ValueVector3',
  slots: { out: ['ValueVector3'] },
}

describe('addParameterToBlockStructure', () => {
  it('desativa slots por padrão para parâmetro simples quando solicitado', () => {
    const result = addParameterToBlockStructure(baseStructure, simpleDoc, {
      disableSimpleSlotsByDefault: true,
    })

    expect(result.error).toBeUndefined()
    expect(result.structure.parameters[0]?.slotRules).toBeUndefined()
  })

  it('mantém slots estruturais mesmo com disableSimpleSlotsByDefault', () => {
    const result = addParameterToBlockStructure(baseStructure, embedDoc, {
      disableSimpleSlotsByDefault: true,
    })

    expect(result.error).toBeUndefined()
    expect(result.structure.parameters[0]?.slotRules?.outputs).toEqual(['ValueVector3'])
  })

  it('em parâmetro complexo mantém apenas saída ativa quando solicitado', () => {
    const pointerDoc: BlockParameterJsonDocument = {
      id: 'primitive_primitive_pointer_VfxPrimitiveMesh',
      block: 'VfxEmitterDefinitionData',
      parameterName: 'primitive',
      name: 'primitive',
      source: { kind: 'parameter', parameterId: 'p-primitive' },
      type: 'pointer',
      pointer: 'VfxPrimitiveMesh',
      slots: { out: ['VfxPrimitiveMesh'] },
    }

    const result = addParameterToBlockStructure(baseStructure, pointerDoc, {
      complexOutputOnlyByDefault: true,
    })

    expect(result.error).toBeUndefined()
    expect(result.structure.parameters[0]?.slotRules).toEqual({
      outputs: ['VfxPrimitiveMesh'],
    })
  })
})
