import { describe, expect, it } from 'vitest'

import {
  classifyRitualLine,
  isEmbedList2Type,
  isEmbedListType,
  isPointerList2Type,
  isPointerListType,
  isPrimitiveListType,
  isStructuralListType,
} from '@/core/classGroupFieldClassifier'

describe('classGroupFieldClassifier', () => {
  it('list[pointer] é list pointer; list[link] estrutural; primitivos simples', () => {
    expect(isPointerListType('list[pointer]')).toBe(true)
    expect(isStructuralListType('list[link]')).toBe(true)
    expect(isPrimitiveListType('list[f32]')).toBe(true)
    expect(isPrimitiveListType('list[string]')).toBe(true)
    expect(isPrimitiveListType('list[hash]')).toBe(true)
    expect(isPrimitiveListType('list[vec2]')).toBe(true)
    expect(isPrimitiveListType('list[vec3]')).toBe(true)
    expect(isPrimitiveListType('list[vec4]')).toBe(true)
    expect(isEmbedListType('list[embed]')).toBe(true)
    expect(isEmbedList2Type('list2[embed]')).toBe(true)
    expect(isEmbedListType('list2[embed]')).toBe(false)
    expect(isPointerList2Type('list2[pointer]')).toBe(true)
    expect(isPointerListType('list2[pointer]')).toBe(false)
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
