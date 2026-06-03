import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from './vfxModel'
import {
  UV_ROTATION_SAFE_MARGIN_DEFAULT_G,
  applyUvRotationSafeScaleCompensation,
  emitterNeedsUvRotationSafeMargin,
  resolveUvRotationSafeMarginG,
  rotateUvAroundCenter,
  uvFromExpandedPlaneLocalPosition,
  uvRotationSafeInnerCorners,
  uvRotationSafeOuterCornerUv,
} from './vfxUvRotationSafeMargin'
import { createUvRotationSafePlaneGeometry } from './vfxPrimitiveMeshPool'

function minimalEmitter(
  overrides: Partial<ParsedVfxEmitterFull> = {},
): ParsedVfxEmitterFull {
  return {
    uvRotation: 0,
    birthOrbitalVelocity: null,
    texDiv: null,
    ...overrides,
  } as ParsedVfxEmitterFull
}

describe('vfxUvRotationSafeMargin', () => {
  it('detecta uvRotation estática', () => {
    expect(emitterNeedsUvRotationSafeMargin(minimalEmitter({ uvRotation: 15 }))).toBe(true)
    expect(emitterNeedsUvRotationSafeMargin(minimalEmitter())).toBe(false)
  })

  it('detecta birthOrbitalVelocity constante e dynamics', () => {
    expect(
      emitterNeedsUvRotationSafeMargin(
        minimalEmitter({
          birthOrbitalVelocity: { constant: [0, 12, 0], dynamics: null },
        }),
      ),
    ).toBe(true)
    expect(
      emitterNeedsUvRotationSafeMargin(
        minimalEmitter({
          birthOrbitalVelocity: {
            constant: [0, 0, 0],
            dynamics: {
              times: [0, 1],
              values: [
                [0, 0, 0],
                [0, 5, 0],
              ],
            },
          },
        }),
      ),
    ).toBe(true)
  })

  it('centro visual mantém UV 0–1; bordas têm UV de padding fora do intervalo', () => {
    expect(uvFromExpandedPlaneLocalPosition(-0.5, -0.5)).toEqual([0, 0])
    expect(uvFromExpandedPlaneLocalPosition(0.5, 0.5)).toEqual([1, 1])

    const [ou, ov] = uvRotationSafeOuterCornerUv()
    expect(ou).toBeGreaterThan(1)
    expect(ov).toBeGreaterThan(1)
  })

  it('geometria safe: cantos da malha têm UV de padding (>1 ou <0)', () => {
    const geo = createUvRotationSafePlaneGeometry()
    const uv = geo.attributes.uv
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i)
      const v = uv.getY(i)
      expect(u > 1 + 1e-3 || u < -1e-3 || v > 1 + 1e-3 || v < -1e-3).toBe(true)
    }
    geo.dispose()
  })

  it('após rotação 45° canto (1,0) excede UV 1 (borda absorve via clamp)', () => {
    const angle = Math.PI / 4
    const rotated = rotateUvAroundCenter([1, 0], angle)
    expect(rotated[0]).toBeGreaterThan(1)
  })

  it('resolveUvRotationSafeMarginG para texDiv retangular', () => {
    expect(resolveUvRotationSafeMarginG([2, 1])).toBeCloseTo(Math.sqrt(5), 6)
    expect(resolveUvRotationSafeMarginG([1, 1])).toBeCloseTo(Math.SQRT2, 6)
  })

  it('compensa escala XY dividindo por g', () => {
    const g = UV_ROTATION_SAFE_MARGIN_DEFAULT_G
    expect(applyUvRotationSafeScaleCompensation([100, 200, 1], g)).toEqual([
      100 / g,
      200 / g,
      1,
    ])
  })
})
