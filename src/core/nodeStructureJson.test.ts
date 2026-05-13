import { describe, expect, it } from 'vitest'

import {
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
