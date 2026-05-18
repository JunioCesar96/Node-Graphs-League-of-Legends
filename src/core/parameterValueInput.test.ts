import { describe, expect, it } from 'vitest'

import {
  isValidPartialParameterValue,
  normalizeParameterValueForCommit,
  U32_MAX,
} from '@/core/parameterValueInput'

describe('isValidPartialParameterValue', () => {
  it('integer: accepts digits and optional leading minus', () => {
    expect(isValidPartialParameterValue('integer', '')).toBe(true)
    expect(isValidPartialParameterValue('integer', '-')).toBe(true)
    expect(isValidPartialParameterValue('integer', '042')).toBe(true)
    expect(isValidPartialParameterValue('integer', '42a')).toBe(false)
    expect(isValidPartialParameterValue('integer', '3.14')).toBe(false)
  })

  it('float: accepts partial decimals and lone minus', () => {
    expect(isValidPartialParameterValue('float', '-')).toBe(true)
    expect(isValidPartialParameterValue('float', '.')).toBe(true)
    expect(isValidPartialParameterValue('float', '-.5')).toBe(true)
    expect(isValidPartialParameterValue('float', '1.')).toBe(true)
    expect(isValidPartialParameterValue('float', '1.2.3')).toBe(false)
    expect(isValidPartialParameterValue('float', 'x')).toBe(false)
  })

  it('vector: rejects letters', () => {
    expect(isValidPartialParameterValue('vector3', '1, 0, -2')).toBe(true)
    expect(isValidPartialParameterValue('vector3', '1, a')).toBe(false)
  })

  it('keyword: rejects newlines', () => {
    expect(isValidPartialParameterValue('keyword', 'foo_bar')).toBe(true)
    expect(isValidPartialParameterValue('keyword', 'a\nb')).toBe(false)
  })

  it('string: accepts anything', () => {
    expect(isValidPartialParameterValue('string', 'anything 🎵')).toBe(true)
  })

  it('u32: accepts only digits while editing', () => {
    expect(isValidPartialParameterValue('u32', '')).toBe(true)
    expect(isValidPartialParameterValue('u32', '042')).toBe(true)
    expect(isValidPartialParameterValue('u32', '4294967295')).toBe(true)
    expect(isValidPartialParameterValue('u32', '-')).toBe(false)
    expect(isValidPartialParameterValue('u32', '3.14')).toBe(false)
    expect(isValidPartialParameterValue('u32', '42a')).toBe(false)
  })

  it('i32: aceita sinal durante edição', () => {
    expect(isValidPartialParameterValue('i32', '-')).toBe(true)
    expect(isValidPartialParameterValue('i32', '-42')).toBe(true)
    expect(isValidPartialParameterValue('i32', '3.14')).toBe(false)
  })

  it('bool: aceita prefixos de true/false', () => {
    expect(isValidPartialParameterValue('bool', '')).toBe(true)
    expect(isValidPartialParameterValue('bool', 'tr')).toBe(true)
    expect(isValidPartialParameterValue('bool', 'false')).toBe(true)
    expect(isValidPartialParameterValue('bool', 'yes')).toBe(false)
  })

  it('f32: aceita decimal como float', () => {
    expect(isValidPartialParameterValue('f32', '-.5')).toBe(true)
    expect(isValidPartialParameterValue('f32', '1.2.3')).toBe(false)
  })
})

describe('normalizeParameterValueForCommit', () => {
  it('u32: clamp no commit', () => {
    expect(normalizeParameterValueForCommit('u32', '')).toBe('')
    expect(normalizeParameterValueForCommit('u32', '42')).toBe('42')
    expect(normalizeParameterValueForCommit('u32', '5000000000')).toBe(String(U32_MAX))
    expect(normalizeParameterValueForCommit('u32', '0042')).toBe('42')
  })

  it('bool: normaliza para true/false', () => {
    expect(normalizeParameterValueForCommit('bool', 'TRUE')).toBe('true')
    expect(normalizeParameterValueForCommit('bool', '')).toBe('false')
  })

  it('outros tipos: valor inalterado', () => {
    expect(normalizeParameterValueForCommit('integer', '-5')).toBe('-5')
    expect(normalizeParameterValueForCommit('string', 'x')).toBe('x')
  })
})
