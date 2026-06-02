import { describe, expect, it } from 'vitest'

import {
  groundEulerFromSurfaceNormal,
  shouldTiltToGroundNormal,
} from './vfxGroundNormalAlign'

describe('vfxGroundNormalAlign', () => {
  it('plano horizontal → só spin em Z', () => {
    const euler = groundEulerFromSurfaceNormal([0, 0, 1], 0.5)
    expect(euler[0]).toBeCloseTo(0, 3)
    expect(euler[1]).toBeCloseTo(0, 3)
    expect(euler[2]).toBeCloseTo(0.5, 3)
  })

  it('detecta inclinação fora do vertical', () => {
    expect(shouldTiltToGroundNormal([0, 0, 1])).toBe(false)
    expect(shouldTiltToGroundNormal([0.3, 0.1, 0.9])).toBe(true)
  })

  it('superfície inclinada produz euler não nulo em X/Y', () => {
    const euler = groundEulerFromSurfaceNormal([0.4, 0.2, 0.8], 0)
    expect(Math.abs(euler[0]) + Math.abs(euler[1])).toBeGreaterThan(0.01)
  })
})
