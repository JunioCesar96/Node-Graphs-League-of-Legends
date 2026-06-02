import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'

import {
  getPrimitiveBasisMatrix,
  groundMeshRotationEuler,
  velocityInOrientedSpace,
} from './vfxPrimitiveBasis'
import type { TransformPipelineDefinition } from './semantic/vfxTransformTypes'

const groundPipeline: TransformPipelineDefinition = {
  orientationMode: 'GroundAligned',
  scaleSpace: 'GroundPlane',
  simulationSpace: 'World',
  transformOrder: 'GroundBasisFirst',
  billboardMode: 'none',
  useLeagueMatrixP: false,
}

describe('getPrimitiveBasisMatrix', () => {
  it('ground: normal LoL Y e up LoL Z no espaço do jogo', () => {
    const m = getPrimitiveBasisMatrix('planar', groundPipeline)
    const normal = new Vector3().setFromMatrixColumn(m, 2)
    const up = new Vector3().setFromMatrixColumn(m, 1)
    expect(normal.y).toBeCloseTo(1, 5)
    expect(up.z).toBeCloseTo(1, 5)
  })
})

describe('groundMeshRotationEuler', () => {
  it('{-90,-90,0} → euler nulo no mesh local', () => {
    expect(groundMeshRotationEuler([-90, -90, 0], [0, 0, 0], 0, null)).toEqual([0, 0, 0])
  })

  it('spin Z LoL → Z mesh', () => {
    const rot = groundMeshRotationEuler([0, 0, 45], [0, 0, 0], 0, null)
    expect(rot[2]).toBeCloseTo(Math.PI / 4, 5)
  })
})

describe('velocityInOrientedSpace', () => {
  it('DirectionAligned: velocidade LoL Y vira eixo local', () => {
    const pipeline: TransformPipelineDefinition = {
      ...groundPipeline,
      orientationMode: 'DirectionAligned',
    }
    const v = velocityInOrientedSpace([0, 100, 0], pipeline)
    expect(v[1]).toBeCloseTo(100, 3)
    expect(v[0]).toBe(0)
    expect(v[2]).toBe(0)
  })
})
