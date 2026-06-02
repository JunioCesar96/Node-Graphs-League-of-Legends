import { Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { leagueLocalToThree } from './lolCoords'
import {
  composeParticleWorldMatrix,
  decomposeWorldMatrix,
  worldMatrixToFlat16,
} from './vfxWorldMatrix'
import type { TransformPipelineDefinition } from './semantic/vfxTransformTypes'

const billboardPipeline: TransformPipelineDefinition = {
  orientationMode: 'BillboardCamera',
  scaleSpace: 'PrimitiveLocal',
  simulationSpace: 'World',
  transformOrder: 'OrientThenScale',
  billboardMode: 'camera',
  useLeagueMatrixP: true,
}

const groundPipeline: TransformPipelineDefinition = {
  orientationMode: 'GroundAligned',
  scaleSpace: 'GroundPlane',
  simulationSpace: 'World',
  transformOrder: 'GroundBasisFirst',
  billboardMode: 'none',
  useLeagueMatrixP: false,
}

describe('composeParticleWorldMatrix', () => {
  it('ground: group só T×S (rotação no mesh local)', () => {
    const m = composeParticleWorldMatrix({
      positionThree: [1, 2, 0.02],
      rotationEulerRad: [0, 0, 0.5],
      scaleThree: [6, 6, 1],
      planeBaseRotation: [0, 0, 0],
      pipeline: groundPipeline,
      primitiveKind: 'planar',
    })
    const { position, scale } = decomposeWorldMatrix(m)
    expect(position[0]).toBeCloseTo(1, 4)
    expect(position[2]).toBeCloseTo(0.02, 4)
    expect(scale[0]).toBeCloseTo(6, 2)
    expect(scale[1]).toBeCloseTo(6, 2)
  })

  it('useLeagueMatrixP: posição alinhada com leagueLocalToThree', () => {
    const positionLol: [number, number, number] = [0, 100, 0]
    const rotationLolDeg: [number, number, number] = [0, 0, 0]
    const scaleLol: [number, number, number] = [25, 35, 1]
    const vfxScale = 0.01

    const m = composeParticleWorldMatrix({
      positionThree: [0, 0, 1],
      rotationEulerRad: [0, 0, 0],
      scaleThree: [0.25, 0.35, 1],
      planeBaseRotation: [0, 0, 0],
      pipeline: billboardPipeline,
      primitiveKind: 'arbitrary_quad',
      positionLol,
      rotationLolDeg,
      scaleLol,
      vfxScale,
    })

    const ref = leagueLocalToThree(
      [positionLol[0] * vfxScale, positionLol[1] * vfxScale, positionLol[2] * vfxScale],
      [0, 0, 0, 1],
      scaleLol,
    )

    const { position } = decomposeWorldMatrix(m)
    expect(position[0]).toBeCloseTo(ref.translation[0], 3)
    expect(position[1]).toBeCloseTo(ref.translation[1], 3)
    expect(position[2]).toBeCloseTo(ref.translation[2], 3)
  })

  it('worldMatrixToFlat16 round-trip', () => {
    const m = new Matrix4().makeTranslation(1, 2, 3)
    const flat = worldMatrixToFlat16(m)
    expect(flat.length).toBe(16)
    const pos = new Vector3().setFromMatrixPosition(m)
    expect(pos.x).toBeCloseTo(1, 5)
  })
})
