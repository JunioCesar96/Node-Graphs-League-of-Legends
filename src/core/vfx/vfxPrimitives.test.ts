import { describe, expect, it } from 'vitest'

import {
  birthRotationGroundInPlaneEuler,
  planeBaseRotation,
  resolvePlaneFacing,
} from './vfxPrimitives'

describe('vfxPrimitives', () => {
  it('isGroundLayer usa facing ground', () => {
    expect(resolvePlaneFacing([0, 0, 0], true)).toBe('ground')
  })

  it('planeBaseRotation ground aponta normal para cima (+90° X)', () => {
    const [rx, ry, rz] = planeBaseRotation('ground')
    expect(rx).toBeCloseTo(Math.PI / 2)
    expect(ry).toBe(0)
    expect(rz).toBe(0)
  })

  it('birthRotationGroundInPlaneEuler ignora componentes de deitar no chão', () => {
    expect(birthRotationGroundInPlaneEuler([-90, -90, 0], [0, 0, 0], 0)).toEqual([0, 0, 0])
  })
})
