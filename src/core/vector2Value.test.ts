import { describe, expect, it } from 'vitest'

import {
  formatVector2String,
  normalizeVector2String,
  parseVector2String,
  plotFractionFromVector2,
  vector2FromPlotFraction,
} from '@/core/vector2Value'

describe('vector2Value', () => {
  it('parse e formata par x,y', () => {
    expect(parseVector2String('4, 4')).toEqual({ x: 4, y: 4 })
    expect(formatVector2String({ x: 4, y: 4 })).toBe('4, 4')
  })

  it('normaliza entradas inválidas', () => {
    expect(normalizeVector2String('')).toBe('0, 0')
    expect(normalizeVector2String('bad, 2')).toBe('0, 2')
  })

  it('mapeia frações do plot para coordenadas positivas', () => {
    expect(vector2FromPlotFraction(0.5, 0.5, 12, 8, false)).toEqual({ x: 6, y: 4 })
    const back = plotFractionFromVector2({ x: 6, y: 4 }, 12, 8, false)
    expect(back.nx).toBeCloseTo(0.5)
    expect(back.ny).toBeCloseTo(0.5)
  })

  it('mapeia frações com eixo negativo', () => {
    expect(vector2FromPlotFraction(0.5, 0.5, 12, 8, true)).toEqual({ x: 0, y: 0 })
    expect(vector2FromPlotFraction(1, 0, 12, 8, true)).toEqual({ x: 12, y: 8 })
  })
})
