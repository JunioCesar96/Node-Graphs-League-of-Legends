import { describe, expect, it } from 'vitest'

import {
  formatOptionF32Scalar,
  formatOptionStringScalar,
  formatOptionVector3Scalar,
  normalizeOptionF32String,
  normalizeOptionStringString,
  normalizeOptionVector3String,
  parseOptionF32Items,
  parseOptionStringItems,
  parseOptionVector3Items,
  resolveOptionParameterType,
} from '@/core/optionValue'

describe('optionValue', () => {
  it('resolveOptionParameterType mapeia inner types conhecidos', () => {
    expect(resolveOptionParameterType('option[f32]')).toBe('optionF32')
    expect(resolveOptionParameterType('option[string]')).toBe('optionString')
    expect(resolveOptionParameterType('option[vec3]')).toBe('optionVector3')
    expect(resolveOptionParameterType('option[hash]')).toBeNull()
  })

  it('optionF32: escalar único (0 ou 1 valor)', () => {
    expect(parseOptionF32Items('1')).toEqual(['1'])
    expect(parseOptionF32Items('1\n2')).toEqual(['1'])
    expect(formatOptionF32Scalar(['10.5'])).toBe('10.5')
    expect(formatOptionF32Scalar([])).toBe('')
    expect(normalizeOptionF32String('  2.5  ')).toBe('2.5')
  })

  it('optionString: escalar único', () => {
    expect(parseOptionStringItems('"path.tex"')).toEqual(['path.tex'])
    expect(formatOptionStringScalar(['ASSETS/foo.tex'])).toBe('ASSETS/foo.tex')
    expect(normalizeOptionStringString('"a"\n"b"')).toBe('a')
  })

  it('optionVector3: escalar ou lista de um', () => {
    expect(normalizeOptionVector3String('1, 2, 3')).toBe('1, 2, 3')
    expect(formatOptionVector3Scalar(parseOptionVector3Items('10, 20, 30'))).toBe('10, 20, 30')
  })
})
