import { describe, expect, it } from 'vitest'

import type { BlockParameterDef } from './blockSchema'
import {
  applyInspectorEntryToParameterDef,
  blockInspectorEntryFromParameterDef,
  blockParameterDefFromJsonDocument,
  blockParameterJsonDocumentToNodeDataType,
  isParameterAlreadyOnBlock,
} from './blockParameterFromJson'
import type { BlockParameterJsonDocument } from './blockParameterJson'

const simpleDoc: BlockParameterJsonDocument = {
  id: 'blendMode_blendMode',
  block: 'VfxEmitterDefinitionData',
  parameterName: 'blendMode',
  name: 'blendMode',
  source: {
    kind: 'parameter',
    parameterId: 'vfx-emitter-definition-data__main-entries-{particlePath}_parameter_blendMode',
  },
  type: 'u8',
  value: '1',
  slots: { in: ['u8'], out: ['u8'] },
}

const pointerDoc: BlockParameterJsonDocument = {
  id: 'primitive_primitive_pointer_VfxPrimitiveMesh',
  block: 'VfxEmitterDefinitionData',
  parameterName: 'primitive',
  name: 'primitive',
  source: {
    kind: 'parameter',
    parameterId: 'vfx-emitter-definition-data__main-entries-{particlePath}_parameter_primitive',
  },
  type: 'pointer',
  pointer: 'VfxPrimitiveMesh',
  slots: { out: ['VfxPrimitiveMesh'] },
}

describe('blockParameterDefFromJsonDocument', () => {
  it('converte parâmetro simples com slots in/out', () => {
    const def = blockParameterDefFromJsonDocument(simpleDoc, 'VfxEmitterDefinitionData', [])
    expect(def).toMatchObject({
      nameParameter: 'blendMode',
      typeParameter: 'u8',
      defaultValue: '1',
      sourcePath: { kind: 'parameter', parameterId: simpleDoc.source.parameterId },
      slotRules: { inputs: ['u8'], outputs: ['u8'] },
    })
  })

  it('converte pointer com slot IN obrigatório', () => {
    const def = blockParameterDefFromJsonDocument(pointerDoc, 'VfxEmitterDefinitionData', [])
    expect(def.sourcePath.kind).toBe('pointerChild')
    expect(def.slotRules).toEqual({
      inputs: ['VfxPrimitiveMesh'],
      outputs: ['VfxPrimitiveMesh'],
    })
  })

  it('dedupe por parameterId no bloco', () => {
    const existing: BlockParameterDef[] = [
      blockParameterDefFromJsonDocument(simpleDoc, 'Emitter', []),
    ]
    expect(isParameterAlreadyOnBlock(existing, simpleDoc)).toBe(true)
  })
})

describe('blockParameterJsonDocumentToNodeDataType', () => {
  it('mapeia tipos estruturais e primitivos para SyntaxType', () => {
    expect(blockParameterJsonDocumentToNodeDataType(simpleDoc)).toBe('u8')
    expect(blockParameterJsonDocumentToNodeDataType(pointerDoc)).toBe('mapHashPointer')
  })
})

describe('applyInspectorEntryToParameterDef', () => {
  it('preserva slot OUT em parâmetro estrutural', () => {
    const def = blockParameterDefFromJsonDocument(pointerDoc, 'Emitter', [])
    const entry = blockInspectorEntryFromParameterDef(def)
    const edited = {
      ...entry,
      slotTags: entry.slotTags?.filter((tag) => tag.direction !== 'output'),
    }
    const merged = applyInspectorEntryToParameterDef(def, edited)
    expect(merged.slotRules?.outputs).toEqual(['VfxPrimitiveMesh'])
  })
})
