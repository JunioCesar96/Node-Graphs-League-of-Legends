import { describe, expect, it } from 'vitest'

import type { BlockParameterDef } from './blockSchema'
import {
  applyInspectorEntryToParameterDef,
  blockInspectorEntryFromParameterDef,
  blockParameterDefFromJsonDocument,
  blockParameterJsonDocumentToNodeDataType,
  isParameterAlreadyOnBlock,
} from './blockParameterFromJson'
import { blockInspectorTagsFromEntry } from './blockInspectorUi'
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
    expect(def.listParameter).toBeUndefined()
  })

  it('converte list[pointer] com list: true no JSON', () => {
    const listPointerDoc: BlockParameterJsonDocument = {
      ...pointerDoc,
      id: 'complexEmitterDefinitionData_complexEmitterDefinitionData_pointer_VfxEmitterDefinitionData',
      parameterName: 'complexEmitterDefinitionData',
      name: 'complexEmitterDefinitionData',
      pointer: 'VfxEmitterDefinitionData',
      list: true,
      slots: { out: ['VfxEmitterDefinitionData'] },
    }
    const def = blockParameterDefFromJsonDocument(listPointerDoc, 'VfxSystemDefinitionData', [])
    expect(def.listParameter).toBe(true)
    expect(def.typeParameter).toBe('VfxEmitterDefinitionData')
  })

  it('dedupe por parameterId no bloco', () => {
    const existing: BlockParameterDef[] = [
      blockParameterDefFromJsonDocument(simpleDoc, 'Emitter', []),
    ]
    expect(isParameterAlreadyOnBlock(existing, simpleDoc)).toBe(true)
  })

  it('converte mapHashEmbed com entries[] do catálogo JSON', () => {
    const mapDoc: BlockParameterJsonDocument = {
      id: 'entries_entries_mapHashEmbed',
      block: 'Main',
      parameterName: 'entries',
      name: 'entries',
      source: {
        kind: 'parameter',
        parameterId: 'main_parameter_entries',
      },
      type: 'mapHashEmbed',
      mapKind: 'mapHashEmbed',
      entries: [
        { key: 'Characters/Brand/Skins/Skin0/Particles/Brand_Base_Joke', target: 'VfxSystemDefinitionData' },
        { key: '0xdeadbeef', target: 'ResourceResolver' },
      ],
      slots: { out: ['VfxSystemDefinitionData', 'ResourceResolver'] },
    }

    const def = blockParameterDefFromJsonDocument(mapDoc, 'Main', [])
    expect(def.defaultValue).toContain('Characters/Brand/Skins/Skin0/Particles/Brand_Base_Joke')
    expect(def.defaultValue).toContain('VfxSystemDefinitionData')
    expect(def.defaultValue).toContain('0xdeadbeef')
  })
})

describe('blockParameterJsonDocumentToNodeDataType', () => {
  it('mapeia tipos estruturais e primitivos para SyntaxType', () => {
    expect(blockParameterJsonDocumentToNodeDataType(simpleDoc)).toBe('u8')
    expect(blockParameterJsonDocumentToNodeDataType(pointerDoc)).toBe('mapHashPointer')
  })
})

describe('blockInspectorEntryFromParameterDef', () => {
  it('expõe IN/OUT do tipo do parâmetro desactivados quando sem slots', () => {
    const def = blockParameterDefFromJsonDocument(
      {
        ...simpleDoc,
        slots: { in: [], out: [] },
      },
      'VfxEmitterDefinitionData',
      [],
    )
    const entry = blockInspectorEntryFromParameterDef(def)
    expect(blockInspectorTagsFromEntry(entry)).toEqual([
      { direction: 'input', type: 'u8', active: false },
      { direction: 'output', type: 'u8', active: false },
    ])
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

  it('aplica slotRules explícitas quando slotTags está vazio', () => {
    const def = blockParameterDefFromJsonDocument(
      {
        ...simpleDoc,
        slots: { in: [], out: [] },
      },
      'VfxEmitterDefinitionData',
      [],
    )
    const withoutSlots = { ...def, slotRules: undefined }
    const merged = applyInspectorEntryToParameterDef(withoutSlots, {
      ...blockInspectorEntryFromParameterDef(withoutSlots),
      slotTags: [],
      slotRules: { outputs: ['string'], inputs: ['string'] },
    })
    expect(merged.slotRules).toEqual({ outputs: ['string'], inputs: ['string'] })
  })
})
