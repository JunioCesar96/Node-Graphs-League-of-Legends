import { describe, expect, it } from 'vitest'

import {
  embedDefinitionFromJsonStub,
  isEmbedStubShape,
  isListEmbedStubShape,
  isListPointerStubShape,
  isPointerStubShape,
  listEmbedDefinitionFromJsonStub,
  listPointerDefinitionFromJsonStub,
  pointerDefinitionFromJsonStub,
  nomenclatureGroupNumberFromLabel,
  nodeSchemaFromStructureJson,
  parseNomenclatureFromStructureJson,
} from './nodeStructureJson'

describe('nomenclatureGroupNumberFromLabel', () => {
  it('extrai o número após #', () => {
    expect(nomenclatureGroupNumberFromLabel('#2 Entidades')).toBe(2)
    expect(nomenclatureGroupNumberFromLabel('  #12 X')).toBe(12)
  })

  it('devolve null se não houver padrão', () => {
    expect(nomenclatureGroupNumberFromLabel(undefined)).toBeNull()
    expect(nomenclatureGroupNumberFromLabel('Sem número')).toBeNull()
    expect(nomenclatureGroupNumberFromLabel('')).toBeNull()
  })
})

describe('parseNomenclatureFromStructureJson', () => {
  it('aceita group e collection vazios; só collectionType é obrigatório', () => {
    expect(
      parseNomenclatureFromStructureJson({
        group: '',
        collection: '',
        collectionType: 'Emitter',
      }),
    ).toEqual({ group: '', collection: '', collectionType: 'Emitter' })
  })

  it('omite group/collection como string → usa ""', () => {
    expect(parseNomenclatureFromStructureJson({ collectionType: 'VFX' })).toEqual({
      group: '',
      collection: '',
      collectionType: 'VFX',
    })
  })

  it('preserva pathHierarchy quando presente no JSON', () => {
    const path = '#1 Root Map > #2 VFX Definition Root > #3 Internal Structures > #3 Embed Block'
    expect(
      parseNomenclatureFromStructureJson({
        group: '',
        collection: '',
        collectionType: 'Emitter',
        pathHierarchy: path,
      }),
    ).toEqual({
      group: '',
      collection: '',
      collectionType: 'Emitter',
      pathHierarchy: path,
    })
  })

  it('omite pathHierarchy vazio ou ausente', () => {
    expect(
      parseNomenclatureFromStructureJson({
        group: '',
        collection: '',
        collectionType: 'Emitter',
        pathHierarchy: '',
      }),
    ).toEqual({ group: '', collection: '', collectionType: 'Emitter' })
  })

  it('preserva pathHierarchySteps quando presente no JSON', () => {
    const steps = [
      { id: 'entries', type: '#1 Root Entry' },
      { id: 'DATA/X', type: '#2 VFX Definition Root' },
    ]
    expect(
      parseNomenclatureFromStructureJson({
        group: '',
        collection: '',
        collectionType: 'Emitter',
        pathHierarchySteps: steps,
      }),
    ).toEqual({
      group: '',
      collection: '',
      collectionType: 'Emitter',
      pathHierarchySteps: steps,
    })
  })

  it('aceita pathHierarchy como array de segmentos', () => {
    const steps = [{ id: 'a', type: '#2 VFX Definition Root' }]
    expect(
      parseNomenclatureFromStructureJson({
        group: '',
        collection: '',
        collectionType: 'VFX',
        pathHierarchy: steps as unknown as string,
      }),
    ).toEqual({
      group: '',
      collection: '',
      collectionType: 'VFX',
      pathHierarchySteps: steps,
    })
  })

  it('omite pathHierarchySteps inválido (type vazio)', () => {
    expect(
      parseNomenclatureFromStructureJson({
        group: '',
        collection: '',
        collectionType: 'Emitter',
        pathHierarchySteps: [{ id: 'x', type: '' }],
      }),
    ).toEqual({ group: '', collection: '', collectionType: 'Emitter' })
  })

  it('rejeita collectionType em falta ou só espaços', () => {
    expect(parseNomenclatureFromStructureJson({ group: '#2', collection: '#2', collectionType: '' }))
      .toBeUndefined()
    expect(parseNomenclatureFromStructureJson({ collectionType: '  \t' })).toBeUndefined()
    expect(parseNomenclatureFromStructureJson({})).toBeUndefined()
  })
})

describe('nodeSchemaFromStructureJson com tipo rgba', () => {
  it('aceita parâmetro rgba', () => {
    const schema = nodeSchemaFromStructureJson({
      id: 'tint-node',
      title: 'Tint',
      parameters: [{ id: 't1', name: 'tintRGBA', type: 'rgba', defaultValue: '1, 0.5, 0, 1' }],
      internalStructures: [],
    })
    expect(schema?.parameters[0]?.type).toBe('rgba')
  })
})

describe('nodeSchemaFromStructureJson com tipos primitivos', () => {
  it('aceita parâmetros u32, i32 e f32 sem rejeitar o schema', () => {
    const schema = nodeSchemaFromStructureJson({
      id: 'main',
      title: 'main',
      parameters: [
        { id: 'p-u32', name: 'version', type: 'u32', defaultValue: '3' },
        { id: 'p-i32', name: 'flags', type: 'i32', defaultValue: '-1' },
        { id: 'p-f32', name: 'rate', type: 'f32', defaultValue: '1.5' },
      ],
      internalStructures: [],
      nomenclature: {
        group: '#0 Entidades',
        collection: '#0 Root main',
        collectionType: 'main',
      },
    })
    expect(schema).not.toBeNull()
    expect(schema!.parameters.map((p) => p.type)).toEqual(['u32', 'i32', 'f32'])
  })
})

describe('nodeSchemaFromStructureJson com nomenclatura vazia', () => {
  it('mantém nomenclatura quando só collectionType está preenchido', () => {
    const raw = {
      id: 'Stub',
      title: 'Stub',
      parameters: [
        { id: 'p1', name: 'p', type: 'string' as const, defaultValue: '' },
      ],
      internalStructures: [],
      nomenclature: {
        group: '',
        collection: '',
        collectionType: 'Emitter',
        pathHierarchy: 'a > b',
      },
    }
    const schema = nodeSchemaFromStructureJson(raw)
    expect(schema).not.toBeNull()
    expect(schema!.nomenclature).toEqual({
      group: '',
      collection: '',
      collectionType: 'Emitter',
      pathHierarchy: 'a > b',
    })
  })
})

describe('stubs EMBED / LIST_EMBED', () => {
  const embedStub = {
    id: 'VfxEmitterDefinitionData_embed_bindWeight',
    title: 'bindWeight',
    internalStructures: [{ id: 'c0', name: 'ValueFloat', schemaId: 'value-float' }],
  }

  const listEmbedStub = {
    id: 'VfxEmitterDefinitionData_listEmbed_bindWeight',
    title: 'bindWeight',
    internalStructures: [{ id: 'c1', name: 'ValueFloat', schemaId: 'value-float' }],
  }

  it('isEmbedStubShape aceita só ficheiros _embed_', () => {
    expect(isEmbedStubShape(embedStub)).toBe(true)
    expect(isEmbedStubShape(listEmbedStub)).toBe(false)
  })

  it('isListEmbedStubShape aceita só ficheiros _listEmbed_', () => {
    expect(isListEmbedStubShape(listEmbedStub)).toBe(true)
    expect(isListEmbedStubShape(embedStub)).toBe(false)
  })

  it('embedDefinitionFromJsonStub não classifica LIST_EMBED como EMBED', () => {
    expect(embedDefinitionFromJsonStub(listEmbedStub)).toBeNull()
    expect(embedDefinitionFromJsonStub(embedStub)?.id).toBe(embedStub.id)
  })

  it('listEmbedDefinitionFromJsonStub não classifica EMBED como LIST_EMBED', () => {
    expect(listEmbedDefinitionFromJsonStub(embedStub)).toBeNull()
    expect(listEmbedDefinitionFromJsonStub(listEmbedStub)?.id).toBe(listEmbedStub.id)
  })
})

describe('stubs POINTER / LIST_POINTER', () => {
  const pointerStub = {
    id: 'VfxEmitterDefinitionData_pointer_Dynamics',
    title: 'Dynamics',
    internalStructures: [{ id: 'c0', name: 'ValueColor', schemaId: 'value-color' }],
  }

  const listPointerStub = {
    id: 'VfxSystemDefinitionData_listPointer_ComplexEmitterDefinitionData',
    title: 'ComplexEmitterDefinitionData',
    internalStructures: [{ id: 'c1', name: 'ComplexEmitterDefinitionData', schemaId: 'complex-emitter' }],
  }

  it('isPointerStubShape aceita só ficheiros _pointer_', () => {
    expect(isPointerStubShape(pointerStub)).toBe(true)
    expect(isPointerStubShape(listPointerStub)).toBe(false)
  })

  it('isListPointerStubShape aceita só ficheiros _listPointer_', () => {
    expect(isListPointerStubShape(listPointerStub)).toBe(true)
    expect(isListPointerStubShape(pointerStub)).toBe(false)
  })

  it('pointerDefinitionFromJsonStub não classifica LIST_POINTER como POINTER', () => {
    expect(pointerDefinitionFromJsonStub(listPointerStub)).toBeNull()
    expect(pointerDefinitionFromJsonStub(pointerStub)?.id).toBe(pointerStub.id)
  })

  it('listPointerDefinitionFromJsonStub não classifica POINTER como LIST_POINTER', () => {
    expect(listPointerDefinitionFromJsonStub(pointerStub)).toBeNull()
    expect(listPointerDefinitionFromJsonStub(listPointerStub)?.id).toBe(listPointerStub.id)
  })
})
