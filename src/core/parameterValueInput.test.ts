import { describe, expect, it } from 'vitest'

import { isValidPartialParameterValue } from '@/core/parameterValueInput'

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
})
