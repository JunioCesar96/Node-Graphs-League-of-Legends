import { describe, expect, it } from 'vitest'

import { groupTokenFromParameterDef, parseGroupToken, serializeGroupToken } from './groupTokenParser'
import type { GroupParameterDef } from './groupSchema'

const sampleParam: GroupParameterDef = {
  idParameter: 'Emitter01',
  nameParameter: 'color',
  typeParameter: 'vec4',
  defaultValue: '0.55,0.95,1,1',
  slotRules: { outputs: ['vec4', 'vec4list'], inputs: ['multiplyVec4'] },
  iconHint: null,
  sourcePath: { kind: 'parameter', parameterId: 'p-color' },
}

describe('GroupTokenParser', () => {
  it('serializes and parses a Group token round-trip', () => {
    const token = groupTokenFromParameterDef('VfxEmitterDefinitionData', 'Emitter', sampleParam)
    expect(token).toContain('_groupType&VfxEmitterDefinitionData')
    expect(token).toContain('_endParameter')

    const parsed = parseGroupToken(token)
    expect(parsed).not.toBeNull()
    expect(parsed?.groupType).toBe('VfxEmitterDefinitionData')
    expect(parsed?.groupName).toBe('Emitter')
    expect(parsed?.idParameter).toBe('Emitter01')
    expect(parsed?.nameParameter).toBe('color')
    expect(parsed?.typeParameter).toBe('vec4')
    expect(parsed?.slotRules?.outputs).toEqual(['vec4', 'vec4list'])
  })

  it('preserves icon hints in name parameter', () => {
    const token = serializeGroupToken({
      groupType: 'VfxEmitterDefinitionData',
      groupName: 'Emitter',
      idParameter: 'Emitter03',
      nameParameter: 'texture',
      typeParameter: 'string',
      defaultValue: '{"ASSETS/spark_soft.tex"}',
      iconHint: 'Img',
    })
    const parsed = parseGroupToken(token)
    expect(parsed?.iconHint).toBe('Img')
    expect(parsed?.nameParameter).toBe('texture')
  })
})
