import { describe, expect, it } from 'vitest'

import {
  buildNodeBaseListEmbedPayload,
  buildNodeBaseParameterPayload,
  buildNodeBaseSchemaBody,
  cloneNomenclatureForNodeBase,
  collectSchemaIdsFromListEmbedJson,
  defaultValueForNodeBaseType,
  isKnownStructureParameterType,
  nodeBaseListEmbedId,
  nodeBaseParameterId,
  readListEmbedBlocksFromSchemaJson,
} from './extractNodeBaseParameters'

describe('defaultValueForNodeBaseType', () => {
  it('mapeia tipos da spec / schema', () => {
    expect(defaultValueForNodeBaseType('vector3')).toBe('0,0,0')
    expect(defaultValueForNodeBaseType('vector2')).toBe('0,0')
    expect(defaultValueForNodeBaseType('vector4')).toBe('0,0,0,0')
    expect(defaultValueForNodeBaseType('float')).toBe('0')
    expect(defaultValueForNodeBaseType('double')).toBe('0')
    expect(defaultValueForNodeBaseType('integer')).toBe('0')
    expect(defaultValueForNodeBaseType('u32')).toBe('0')
    expect(defaultValueForNodeBaseType('i8')).toBe('0')
    expect(defaultValueForNodeBaseType('f32')).toBe('0')
    expect(defaultValueForNodeBaseType('string')).toBe('')
    expect(defaultValueForNodeBaseType('keyword')).toBe('')
    expect(defaultValueForNodeBaseType('bool')).toBe('false')
    expect(defaultValueForNodeBaseType('boolean')).toBe('false')
  })
})

describe('nodeBaseParameterId', () => {
  it('preserva capitalização de collectionType e nome', () => {
    expect(nodeBaseParameterId('Emitter', 'birthScale0')).toBe('Emitter_birthScale0')
  })
})

describe('nodeBaseListEmbedId', () => {
  it('usa o padrão collectionType_listEmbed_title', () => {
    expect(nodeBaseListEmbedId('SkinMeshDataProperties', 'materialOverride')).toBe(
      'SkinMeshDataProperties_listEmbed_materialOverride',
    )
  })
})

describe('buildNodeBaseListEmbedPayload', () => {
  it('gera stub com catálogo deduplicado por schemaId', () => {
    const payload = buildNodeBaseListEmbedPayload('SkinMeshDataProperties', {
      id: 'skin-mesh-data-properties-material-override',
      title: 'materialOverride',
      internalStructures: [
        {
          schemaId: 'skin-mesh-data-properties-material-override',
          name: 'SkinMeshDataProperties_MaterialOverride',
        },
        {
          schemaId: 'skin-mesh-data-properties-material-override',
          name: 'SkinMeshDataProperties_MaterialOverride',
        },
      ],
    })
    expect(payload).toEqual({
      id: 'SkinMeshDataProperties_listEmbed_materialOverride',
      title: 'materialOverride',
      internalStructures: [
        {
          id: 'SkinMeshDataProperties_listEmbed_materialOverride-catalog-0',
          name: 'SkinMeshDataProperties_MaterialOverride',
          schemaId: 'skin-mesh-data-properties-material-override',
        },
      ],
    })
  })
})

describe('buildNodeBaseParameterPayload', () => {
  it('constrói payload com type em minúsculas', () => {
    const p = buildNodeBaseParameterPayload('Emitter', 'rate', 'Float')
    expect(p).toEqual({
      id: 'Emitter_rate',
      name: 'rate',
      type: 'float',
      defaultValue: '0',
    })
  })

  it('rejeita nome vazio', () => {
    expect(buildNodeBaseParameterPayload('Emitter', '  ', 'float')).toBeNull()
  })
})

describe('buildNodeBaseSchemaBody', () => {
  it('id e title iguais ao collectionType; arrays vazios; nomenclatura copiada', () => {
    const nom = {
      group: '#2 Entidades',
      collection: '#2 Root Entry',
      collectionType: 'Emitter',
    }
    const body = buildNodeBaseSchemaBody('Emitter', nom)
    expect(body).toEqual({
      internalStructures: [],
      listEmbed: [],
      id: 'Emitter',
      title: 'Emitter',
      nomenclature: { ...nom },
      parameters: [],
    })
    expect(body.nomenclature).not.toBe(nom)
  })

  it('preserva pathHierarchy e pathHierarchySteps (cópia da pilha)', () => {
    const steps = [
      { id: 'entries', type: '#1 Root Entry' },
      { id: 'DATA/X', type: '#2 VFX Definition Root' },
    ]
    const nom = {
      group: '#3 Internal Structures',
      collection: '#3 Embed Block',
      collectionType: 'Emitter',
      pathHierarchy: '#1 Root Entry > #2 VFX Definition Root',
      pathHierarchySteps: steps,
    }
    const body = buildNodeBaseSchemaBody('Emitter', nom)
    expect(body.nomenclature.pathHierarchy).toBe(nom.pathHierarchy)
    expect(body.nomenclature.pathHierarchySteps).toEqual(steps)
    expect(body.nomenclature.pathHierarchySteps).not.toBe(nom.pathHierarchySteps)
    expect(body.nomenclature.pathHierarchySteps?.[0]).not.toBe(steps[0])
  })

  it('cloneNomenclatureForNodeBase omite pathHierarchy vazio e steps vazios', () => {
    expect(
      cloneNomenclatureForNodeBase({
        group: '',
        collection: '',
        collectionType: 'T',
        pathHierarchy: '  ',
        pathHierarchySteps: [],
      }),
    ).toEqual({ group: '', collection: '', collectionType: 'T' })
  })

  it('aceita group/collection vazios (estado inicial até analisador .bin)', () => {
    const nom = { group: '', collection: '', collectionType: 'Emitter' }
    const body = buildNodeBaseSchemaBody('Emitter', nom)
    expect(body!.nomenclature).toEqual(nom)
  })
})

describe('isKnownStructureParameterType', () => {
  it('reconhece tipos do nodeSchema', () => {
    expect(isKnownStructureParameterType('vector3')).toBe(true)
    expect(isKnownStructureParameterType('string')).toBe(true)
    expect(isKnownStructureParameterType('bool')).toBe(true)
  })
})

describe('readListEmbedBlocksFromSchemaJson', () => {
  it('lê listEmbed oficial', () => {
    const raw = {
      listEmbed: [
        {
          id: 'mesh-material-override',
          title: 'materialOverride',
          internalStructures: [
            {
              id: 'mesh-material-override-0',
              name: 'SkinMeshDataProperties_MaterialOverride',
              schemaId: 'skin-mesh-data-properties-material-override',
            },
          ],
        },
      ],
    }
    const blocks = readListEmbedBlocksFromSchemaJson(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.title).toBe('materialOverride')
    expect(collectSchemaIdsFromListEmbedJson(raw)).toEqual(['skin-mesh-data-properties-material-override'])
  })

  it('aceita blocos LIST_EMBED com chave top-level incorreta', () => {
    const raw = {
      '       ': [
        {
          id: 'skin-idle',
          title: 'idleParticlesEffects',
          internalStructures: [
            {
              id: 'skin-idle-0',
              name: 'SkinCharacterDataProperties_CharacterIdleEffect',
              schemaId: 'skin-character-data-properties-character-idle-effect',
            },
          ],
        },
      ],
    }
    const blocks = readListEmbedBlocksFromSchemaJson(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.title).toBe('idleParticlesEffects')
    expect(collectSchemaIdsFromListEmbedJson(raw)).toEqual([
      'skin-character-data-properties-character-idle-effect',
    ])
  })
})
