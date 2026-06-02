import { describe, expect, it } from 'vitest'

import {
  birthRotationGroundInPlaneEuler,
  isGroundLikeBirthRotation,
  planeBaseRotation,
  resolvePlaneFacing,
} from './vfxPrimitives'

describe('vfxPrimitives', () => {
  it('isGroundLayer usa facing ground', () => {
    expect(resolvePlaneFacing([0, 0, 0], true)).toBe('ground')
  })

  it('planeBaseRotation ground: plano XY, normal +Z', () => {
    const [rx, ry, rz] = planeBaseRotation('ground')
    expect(rx).toBe(0)
    expect(ry).toBe(0)
    expect(rz).toBe(0)
  })

  it('birthRotationGroundInPlaneEuler ignora componentes de deitar no chão', () => {
    expect(birthRotationGroundInPlaneEuler([-90, -90, 0], [0, 0, 0], 0)).toEqual([0, 0, 0])
  })

  it('isGroundLikeBirthRotation reconhece decal {-90,-90,0}', () => {
    expect(isGroundLikeBirthRotation([-90, -90, 0])).toBe(true)
  })

  it('resolvePlaneFacing: ritual ground-like ignora ω orbital em Y', () => {
    expect(resolvePlaneFacing([-90, -90, 0], false, [0, 12, 0])).toBe('ground')
  })

  it('resolvePlaneFacing: ω Y sem ritual ground-like → camera', () => {
    expect(resolvePlaneFacing([0, 0, 0], false, [0, 12, 0])).toBe('camera')
  })
})
