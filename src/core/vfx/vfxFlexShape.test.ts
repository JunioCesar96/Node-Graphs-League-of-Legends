import { describe, expect, it } from 'vitest'

import {
  resolveFlexShapeEmitOffsetMultiplier,
  resolveFlexShapeScaleMultiplier,
} from './vfxFlexShape'

describe('vfxFlexShape', () => {
  const flex = {
    scaleBirthScaleByBoundObjectSize: 0.005,
    scaleEmitOffsetByBoundObjectSize: 0.003,
  }
  const bound: [number, number, number] = [120, 180, 120]

  it('sem flex ou bound → multiplicador 1', () => {
    expect(resolveFlexShapeScaleMultiplier(null, bound)).toBe(1)
    expect(resolveFlexShapeScaleMultiplier(flex, null)).toBe(1)
  })

  it('escala birth com bound magnitude', () => {
    const mul = resolveFlexShapeScaleMultiplier(flex, bound)
    expect(mul).toBeCloseTo(1 + 0.005 * 180, 4)
  })

  it('emit offset flex', () => {
    const mul = resolveFlexShapeEmitOffsetMultiplier(flex, bound)
    expect(mul).toBeCloseTo(1 + 0.003 * 180, 4)
  })
})
