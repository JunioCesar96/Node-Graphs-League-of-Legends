import { describe, expect, it } from 'vitest'

import {
  deriveSliderRange,
  formatVector3String,
  normalizeVector3String,
  parseVector3RitualInput,
  parseVector3String,
  plotFractionFromVector3,
  scalarFromSliderFraction,
  sliderFractionFromScalar,
  vec3CursorSizePx,
  vector3FromPlotFraction,
} from '@/core/vector3Value'

describe('vector3Value', () => {
  it('parse e formata x,y,z', () => {
    expect(parseVector3String('1, 2, 3')).toEqual({ x: 1, y: 2, z: 3 })
    expect(formatVector3String({ x: 1, y: 2, z: 3 })).toBe('1, 2, 3')
  })

  it('parseVector3RitualInput remove chaves ritual', () => {
    expect(parseVector3RitualInput('{ 20, 80, 45 }')).toEqual({ x: 20, y: 80, z: 45 })
    expect(normalizeVector3String('{ 20, 80, 45 }')).toBe('20, 80, 45')
  })

  it('normaliza entradas inválidas', () => {
    expect(normalizeVector3String('')).toBe('0, 0, 0')
    expect(normalizeVector3String('1, bad, 3')).toBe('1, 0, 3')
  })

  it('escala tamanho do ponto com Z', () => {
    expect(vec3CursorSizePx(0)).toBe(14)
    expect(vec3CursorSizePx(5)).toBe(21)
    expect(vec3CursorSizePx(-5)).toBe(7)
  })

  it('mapeia valor escalar para fração do slider', () => {
    expect(sliderFractionFromScalar(0, 0, 10)).toBe(0)
    expect(sliderFractionFromScalar(10, 0, 10)).toBe(1)
    expect(sliderFractionFromScalar(5, 0, 10)).toBeCloseTo(0.5)
    expect(scalarFromSliderFraction(0.5, 0, 10)).toBeCloseTo(5)
  })

  it('deriva intervalo inicial do vetor', () => {
    expect(deriveSliderRange({ x: 0, y: 0, z: 0 })).toEqual({ min: 0, max: 1 })
    expect(deriveSliderRange({ x: 0, y: -200, z: 0 })).toEqual({ min: -200, max: 0 })
    expect(deriveSliderRange({ x: -90, y: -90, z: 0 })).toEqual({ min: -90, max: 0 })
    expect(deriveSliderRange({ x: 680, y: 680, z: 50 })).toEqual({ min: 50, max: 680 })
    expect(deriveSliderRange({ x: 2, y: 3, z: 4 })).toEqual({ min: 2, max: 4 })
    expect(deriveSliderRange({ x: 800, y: 680, z: -300 })).toEqual({ min: -300, max: 800 })
  })

  it('mapeia frações do plot incluindo Z', () => {
    const vector = vector3FromPlotFraction(0.4, 0.6, 0.5, 5, 5, 5, false)
    expect(vector.x).toBeCloseTo(2)
    expect(vector.y).toBeCloseTo(2)
    expect(vector.z).toBeCloseTo(2.5)
    const back = plotFractionFromVector3(vector, 5, 5, 5, false)
    expect(back.nx).toBeCloseTo(0.4)
    expect(back.ny).toBeCloseTo(0.6)
    expect(back.nz).toBeCloseTo(0.5)
  })
})
