import { describe, expect, it } from 'vitest'
import { Euler } from 'three'

import {
  composePlaneMeshQuaternion,
  eulerRadiansToQuaternion,
  quaternionToEulerXyz,
} from './vfxMeshTransform'

describe('vfxMeshTransform', () => {
  it('composePlaneMeshQuaternion: ground base + spin no plano', () => {
    const halfPi = Math.PI / 2
    const quat = composePlaneMeshQuaternion([halfPi, 0, 0], [0, Math.PI / 4, 0])
    const euler = new Euler().setFromQuaternion(quat, 'XYZ')
    expect(euler.x).toBeCloseTo(halfPi, 3)
    expect(euler.y).toBeCloseTo(Math.PI / 4, 3)
  })

  it('composePlaneMeshQuaternion combina base ground com spin no plano', () => {
    const halfPi = Math.PI / 2
    const quat = composePlaneMeshQuaternion([halfPi, 0, 0], [0, Math.PI / 6, 0])
    expect(quat.length()).toBeCloseTo(1, 5)
    const euler = new Euler().setFromQuaternion(quat, 'XYZ')
    expect(euler.x).toBeCloseTo(halfPi, 2)
    expect(Math.abs(euler.y)).toBeGreaterThan(0.1)
  })

  it('round-trip euler → quat → euler', () => {
    const input: [number, number, number] = [0.2, 0.5, -0.3]
    const output = quaternionToEulerXyz(eulerRadiansToQuaternion(input))
    expect(output[0]).toBeCloseTo(input[0], 5)
    expect(output[1]).toBeCloseTo(input[1], 5)
    expect(output[2]).toBeCloseTo(input[2], 5)
  })
})
