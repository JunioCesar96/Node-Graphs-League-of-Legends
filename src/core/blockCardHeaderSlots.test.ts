import { describe, expect, it } from 'vitest'

import {
  expandBlockHeaderSlotPorts,
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

describe('resolveBlockHeaderInputSlotIndexForLink', () => {
  it('resolve slot IN do canvas (normalizado) para birthRotationalVelocity0, não só o primeiro in[]', () => {
    const index = resolveBlockHeaderInputSlotIndexForLink(VALUE_VECTOR3_HEADER_SLOTS, {
      fromParameterName: 'birthRotationalVelocity0',
      outTypes: ['ValueVector3'],
      targetBlockName: 'ValueVector3',
      targetDisplayName: 'ValueVector3',
    })

    expect(index).toBe(0)
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

    expect(index).toBe(0)
  })
})

const VALUE_FLOAT_COMBINED_IN = [
  'in[rate,particleLifetime,bindWeight]',
  'out[ValueFloatPreview]',
] as const

describe('expandBlockHeaderSlotPorts / resolveBlockHeaderInputSlotIdForLink', () => {
  it('expande in[a,b,c] em portas IN separadas', () => {
    const ports = expandBlockHeaderSlotPorts('ValueFloat', VALUE_FLOAT_COMBINED_IN)
    const inputs = ports.filter((port) => port.direction === 'input')
    expect(inputs).toHaveLength(3)
    expect(inputs.map((port) => port.fieldKey)).toEqual(['rate', 'particleLifetime', 'bindWeight'])
  })

  it('resolve slotId específico para particleLifetime', () => {
    const slotId = resolveBlockHeaderInputSlotIdForLink('ValueFloat', VALUE_FLOAT_COMBINED_IN, {
      fromParameterName: 'particleLifetime',
      outTypes: ['ValueFloat'],
      targetBlockName: 'ValueFloat',
    })
    expect(slotId).toBe('block-header:ValueFloat:0:particleLifetime')
  })
})
