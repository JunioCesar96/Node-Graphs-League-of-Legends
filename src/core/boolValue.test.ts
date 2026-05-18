import { describe, expect, it } from 'vitest'

import {
  formatBoolString,
  isValidPartialBoolValue,
  normalizeBoolString,
  parseBoolString,
} from '@/core/boolValue'

describe('boolValue', () => {
  it('parse e formata true/false', () => {
    expect(parseBoolString('true')).toBe(true)
    expect(parseBoolString('false')).toBe(false)
    expect(formatBoolString(true)).toBe('true')
    expect(formatBoolString(false)).toBe('false')
  })

  it('normaliza variantes', () => {
    expect(normalizeBoolString('TRUE')).toBe('true')
    expect(normalizeBoolString('')).toBe('false')
    expect(normalizeBoolString('1')).toBe('true')
  })

  it('valida parcial durante edição', () => {
    expect(isValidPartialBoolValue('tr')).toBe(true)
    expect(isValidPartialBoolValue('fal')).toBe(true)
    expect(isValidPartialBoolValue('yes')).toBe(false)
  })
})
