import { describe, expect, it } from 'vitest'

import {
  expandBlockHeaderSlotPorts,
  normalizeBlockHeaderSlots,
  resolveBlockHeaderInputSlotIdForLink,
  resolveBlockHeaderInputSlotIndexForLink,
} from './blockCardHeaderSlots'

const VALUE_VECTOR3_HEADER_SLOTS = [
  'in[birthVelocity]',
  'out[ValueVector3Preview]',
  'in[birthDrag]',
  'in[EmitterPosition]',
  'in[birthRotation0]',
  'in[birthScale0]',
  'in[scale0]',
  'in[birthRotationalVelocity0]',
] as const

describe('normalizeBlockHeaderSlots', () => {
  it('preserva entradas in[] separadas no array', () => {
    expect(
      normalizeBlockHeaderSlots([
        'in[birthVelocity,birthDrag]',
        'in[number]',
        'out[ValueVector3Preview]',
      ]),
    ).toEqual([
      'in[birthVelocity,birthDrag]',
      'in[number]',
      'out[ValueVector3Preview]',
    ])
  })
})

describe('resolveBlockHeaderInputSlotIndexForLink', () => {
  it('resolve índice do descriptor in[] legado para birthRotationalVelocity0', () => {
    const index = resolveBlockHeaderInputSlotIndexForLink(VALUE_VECTOR3_HEADER_SLOTS, {
      fromParameterName: 'birthRotationalVelocity0',
      outTypes: ['ValueVector3'],
      targetBlockName: 'ValueVector3',
      targetDisplayName: 'ValueVector3',
    })

    expect(index).toBe(7)
  })

  it('resolve slot IN para birthVelocity quando o parâmetro de origem é birthVelocity', () => {
    const index = resolveBlockHeaderInputSlotIndexForLink(VALUE_VECTOR3_HEADER_SLOTS, {
      fromParameterName: 'birthVelocity',
      outTypes: ['ValueVector3'],
      targetBlockName: 'ValueVector3',
    })

    expect(index).toBe(0)
  })

  it('prefere correspondência pelo nome do parâmetro entre vários in[] legados', () => {
    const index = resolveBlockHeaderInputSlotIndexForLink(VALUE_VECTOR3_HEADER_SLOTS, {
      fromParameterName: 'birthDrag',
      outTypes: ['ValueVector3'],
      targetBlockName: 'ValueVector3',
    })

    expect(index).toBe(2)
  })
})

const VALUE_FLOAT_COMBINED_IN = [
  'in[rate,particleLifetime,bindWeight]',
  'out[ValueFloatPreview]',
] as const

const VALUE_VECTOR3_MULTI_IN = [
  'in[birthVelocity,birthDrag,EmitterPosition,birthRotation0,birthScale0,scale0,birthRotationalVelocity0]',
  'in[number]',
  'out[ValueVector3Preview]',
] as const

describe('expandBlockHeaderSlotPorts / resolveBlockHeaderInputSlotIdForLink', () => {
  it('in[a,b,c] num único descriptor gera uma porta IN com vários tipos', () => {
    const ports = expandBlockHeaderSlotPorts('ValueFloat', VALUE_FLOAT_COMBINED_IN)
    const inputs = ports.filter((port) => port.direction === 'input')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]?.types).toEqual(['rate', 'particleLifetime', 'bindWeight'])
    expect(inputs[0]?.slotId).toBe('block-header:ValueFloat:0')
  })

  it('resolve slotId da porta multi-tipo para particleLifetime', () => {
    const slotId = resolveBlockHeaderInputSlotIdForLink('ValueFloat', VALUE_FLOAT_COMBINED_IN, {
      fromParameterName: 'particleLifetime',
      outTypes: ['ValueFloat'],
      targetBlockName: 'ValueFloat',
    })
    expect(slotId).toBe('block-header:ValueFloat:0')
  })

  it('dois descriptors in[] distintos geram duas portas IN', () => {
    const ports = expandBlockHeaderSlotPorts('ValueVector3', VALUE_VECTOR3_MULTI_IN)
    const inputs = ports.filter((port) => port.direction === 'input')
    expect(inputs).toHaveLength(2)
    expect(inputs[0]?.types).toEqual([
      'birthVelocity',
      'birthDrag',
      'EmitterPosition',
      'birthRotation0',
      'birthScale0',
      'scale0',
      'birthRotationalVelocity0',
    ])
    expect(inputs[1]?.types).toEqual(['number'])
  })
})
