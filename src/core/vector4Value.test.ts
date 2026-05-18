import { describe, expect, it } from 'vitest'

import {
  deriveSliderRange,
  formatVector4String,
  normalizeVector4String,
  parseVector4String,
  sliderFractionFromScalar,
} from '@/core/vector4Value'

describe('vector4Value', () => {
  it('parse e formata x,y,z,w', () => {
    expect(parseVector4String('1,2,3,4')).toEqual({ x: 1, y: 2, z: 3, w: 4 })
    expect(formatVector4String({ x: 1, y: 2, z: 3, w: 4 })).toBe('1, 2, 3, 4')
  })

  it('normaliza entradas inválidas', () => {
    expect(normalizeVector4String('')).toBe('0, 0, 0, 0')
    expect(normalizeVector4String('1, bad, 3, 4')).toBe('1, 0, 3, 4')
  })

  it('deriva intervalo inicial do vetor', () => {
    expect(deriveSliderRange({ x: 0, y: -2, z: 0.5, w: 1 })).toEqual({ min: -2, max: 1 })
    expect(deriveSliderRange({ x: 2, y: 3, z: 4, w: 5 })).toEqual({ min: 0, max: 5 })
  })

  it('mapeia valor escalar para fração do slider', () => {
    expect(sliderFractionFromScalar(0, 0, 10)).toBe(0)
    expect(sliderFractionFromScalar(10, 0, 10)).toBe(1)
  })
})
