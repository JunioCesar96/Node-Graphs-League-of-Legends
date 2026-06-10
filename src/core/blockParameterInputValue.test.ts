import { describe, expect, it } from 'vitest'

import { blockParameterTypeToNodeDataType } from '@/core/blockSchema'
import { resolveBlockParameterInputValue } from '@/core/blockParameterInputValue'

describe('blockParameterTypeToNodeDataType', () => {
  it('mapeia tipos compostos usados nos blocos', () => {
    expect(blockParameterTypeToNodeDataType('vec4')).toBe('vector4')
    expect(blockParameterTypeToNodeDataType('listF32')).toBe('listF32')
    expect(blockParameterTypeToNodeDataType('listVector4')).toBe('listVector4')
    expect(blockParameterTypeToNodeDataType('optionF32')).toBe('optionF32')
    expect(blockParameterTypeToNodeDataType('mtx44')).toBe('mtx44')
  })
})

describe('resolveBlockParameterInputValue', () => {
  it('extrai vec4 editável de um token de bloco', () => {
    const token =
      '_blockType&ValueColor_blockName&ValueColor_idParameter&constantValue_constantValue_nameParameter&constantValue_typeParameter&vec4{0.282, 0.163, 0.156, 1}_endParameter'

    expect(resolveBlockParameterInputValue(token, 'vec4')).toBe('0.282, 0.163, 0.156, 1')
  })

  it('normaliza list[f32] de token para editor de lista', () => {
    const token =
      '_blockType&VfxAnimatedColorVariableData_blockName&VfxAnimatedColorVariableData_idParameter&times_times_nameParameter&times_typeParameter&listF32{0\n0.255799\n1}_endParameter'

    expect(resolveBlockParameterInputValue(token, 'listF32')).toBe('0\n0.255799\n1')
  })

  it('normaliza list[vec4] de token para editor de lista', () => {
    const token =
      '_blockType&VfxAnimatedColorVariableData_blockName&VfxAnimatedColorVariableData_idParameter&values_values_nameParameter&values_typeParameter&listVector4{{ 0.282, 0.163, 0.156, 1 }\n{ 0.282, 0, 0, 0.522 }}_endParameter'

    expect(resolveBlockParameterInputValue(token, 'listVector4')).toContain('0.282, 0.163, 0.156, 1')
  })

  it('extrai vec3 editável mesmo com output[vec3] no token', () => {
    const token =
      '_blockType&ValueVector3_blockName&ValueVector3_idParameter&constantValue_constantValue_nameParameter&constantValue_typeParameter&vec3{680, 680, 50}_slotParameter&output[vec3]_endParameter'

    expect(resolveBlockParameterInputValue(token, 'vec3')).toBe('680, 680, 50')
  })

  it('mantém token completo quando output aponta para bloco embed', () => {
    const token =
      '_blockType&VfxEmitterDefinitionData_blockName&VfxEmitterDefinitionData_idParameter&birthScale0_birthScale0_nameParameter&birthScale0_typeParameter&ValueVector3{}_slotParameter&output[ValueVector3]_endParameter'

    expect(resolveBlockParameterInputValue(token, 'ValueVector3')).toBe(token)
  })
})
