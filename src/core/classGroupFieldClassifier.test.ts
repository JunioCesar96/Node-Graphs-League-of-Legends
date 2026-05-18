import { describe, expect, it } from 'vitest'

import {
  classifyRitualLine,
  isPrimitiveListType,
  isStructuralListType,
} from '@/core/classGroupFieldClassifier'

describe('classGroupFieldClassifier', () => {
  it('list[pointer] é estrutural; list[string] e list[vec4] são simples', () => {
    expect(isStructuralListType('list[pointer]')).toBe(true)
    expect(isPrimitiveListType('list[f32]')).toBe(true)
    expect(isPrimitiveListType('list[string]')).toBe(true)
    expect(isPrimitiveListType('list[hash]')).toBe(true)
    expect(isPrimitiveListType('list[vec2]')).toBe(true)
    expect(isPrimitiveListType('list[vec3]')).toBe(true)
    expect(isPrimitiveListType('list[vec4]')).toBe(true)
    expect(isStructuralListType('list2[embed]')).toBe(true)
  })

  it('classifica rgba com valor entre chavetas como simples', () => {
    const line = '            ReflectionFresnelColor: rgba = { 153, 153, 153, 255 }'
    const parsed = classifyRitualLine(line)
    expect(parsed.kind).toBe('simple')
    expect(parsed.fieldName).toBe('ReflectionFresnelColor')
    expect(parsed.ritType).toBe('rgba')
    expect(parsed.rawValue).toContain('153')
  })

  it('classifica mFlags como simples e ComplexEmitter como estrutural', () => {
    expect(classifyRitualLine('    mFlags: u16 = 0').kind).toBe('simple')
    expect(
      classifyRitualLine('        ComplexEmitterDefinitionData: list[pointer] = {').kind,
    ).toBe('structural')
  })
})
