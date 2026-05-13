import { describe, expect, it } from 'vitest'

import {
  buildNodeBaseParameterPayload,
  buildNodeBaseSchemaBody,
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
})

describe('isKnownStructureParameterType', () => {
  it('reconhece tipos do nodeSchema', () => {
    expect(isKnownStructureParameterType('vector3')).toBe(true)
    expect(isKnownStructureParameterType('string')).toBe(true)
    expect(isKnownStructureParameterType('bool')).toBe(false)
  })
})
