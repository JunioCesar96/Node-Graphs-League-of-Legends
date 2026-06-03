import { describe, expect, it } from 'vitest'

import { lolRotationDegreesToThreeEuler } from './vfxGlobalRotation'

describe('lolRotationDegreesToThreeEuler', () => {
  it('sem correção global permuta eixos Y/Z', () => {
    const [x, y, z] = lolRotationDegreesToThreeEuler([90, 45, 0], false)
    expect(x).toBeCloseTo(Math.PI / 2, 5)
    expect(y).toBeCloseTo(0, 5)
    expect(z).toBeCloseTo((45 * Math.PI) / 180, 5)
  })

  it('com correção global identidade LoL permanece finita', () => {
    const rot = lolRotationDegreesToThreeEuler([0, 0, 0], true)
    expect(rot.every((value) => Number.isFinite(value))).toBe(true)
  })

  it('correção global difere da permuta legada para rotação não nula', () => {
    const legacy = lolRotationDegreesToThreeEuler([30, 60, 90], false)
    const corrected = lolRotationDegreesToThreeEuler([30, 60, 90], true)
    const differs = legacy.some((value, index) => Math.abs(value - corrected[index]!) > 1e-4)
    expect(differs).toBe(true)
  })

  it('offset global em graus altera resultado', () => {
    const base = lolRotationDegreesToThreeEuler([10, 20, 30], true, [0, 0, 0])
    const shifted = lolRotationDegreesToThreeEuler([10, 20, 30], true, [5, 0, 0])
    const differs = base.some((value, index) => Math.abs(value - shifted[index]!) > 1e-5)
    expect(differs).toBe(true)
  })

  it('{-90,-90,0} legado produz euler grande (ground usa path in-plane separado)', () => {
    const rot = lolRotationDegreesToThreeEuler([-90, -90, 0], false)
    const magnitude = Math.hypot(rot[0], rot[1], rot[2])
    expect(magnitude).toBeGreaterThan(1)
  })
})
