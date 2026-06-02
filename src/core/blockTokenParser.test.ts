import { describe, expect, it } from 'vitest'

import { blockTokenFromParameterDef, parseBlockToken, serializeBlockToken } from './blockTokenParser'
import type { BlockParameterDef } from './blockSchema'

const sampleParam: BlockParameterDef = {
  idParameter: 'Emitter01',
  nameParameter: 'color',
  typeParameter: 'vec4',
  defaultValue: '0.55,0.95,1,1',
  slotRules: { outputs: ['vec4', 'vec4list'], inputs: ['multiplyVec4'] },
  iconHint: null,
  sourcePath: { kind: 'parameter', parameterId: 'p-color' },
}

describe('blockTokenParser', () => {
  it('serializes and parses a block token round-trip', () => {
    const token = blockTokenFromParameterDef('VfxEmitterDefinitionData', 'Emitter', sampleParam)
    expect(token).toContain('_blockType&VfxEmitterDefinitionData')
    expect(token).toContain('_endParameter')

    const parsed = parseBlockToken(token)
    expect(parsed).not.toBeNull()
    expect(parsed?.blockType).toBe('VfxEmitterDefinitionData')
    expect(parsed?.blockName).toBe('Emitter')
    expect(parsed?.idParameter).toBe('Emitter01')
    expect(parsed?.nameParameter).toBe('color')
    expect(parsed?.typeParameter).toBe('vec4')
    expect(parsed?.slotRules?.outputs).toEqual(['vec4', 'vec4list'])
  })

  it('preserves icon hints in name parameter', () => {
    const token = serializeBlockToken({
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      idParameter: 'Emitter03',
      nameParameter: 'texture',
      typeParameter: 'string',
      defaultValue: '{"ASSETS/spark_soft.tex"}',
      iconHint: 'Img',
    })
    const parsed = parseBlockToken(token)
    expect(parsed?.iconHint).toBe('Img')
    expect(parsed?.nameParameter).toBe('texture')
  })
})
