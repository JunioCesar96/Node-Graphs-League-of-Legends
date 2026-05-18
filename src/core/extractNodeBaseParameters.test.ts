import { describe, expect, it } from 'vitest'

import {
  buildNodeBaseParameterPayload,
  buildNodeBaseSchemaBody,
  cloneNomenclatureForNodeBase,
  defaultValueForNodeBaseType,
  isKnownStructureParameterType,
  nodeBaseParameterId,
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
