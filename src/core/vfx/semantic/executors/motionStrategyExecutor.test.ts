import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from '../../vfxModel'
import { computeEmitterFrameState } from '../../vfxWebAnimation'
import { getComposablePipeline } from '../vfxRenderStrategy'
import { applyMotionAdjustments, executeMotionStrategies } from './motionStrategyExecutor'

function makeGroundEmitter(): ParsedVfxEmitterFull {
  return {
    name: 'cracks2',
    isSingleParticle: true,
    isRandomStartFrame: false,
    isLocalOrientation: false,
    isRotationEnabled: false,
    isUniformScale: false,
    isGroundLayer: true,
    useNavmeshMask: true,
    depthBiasFactors: { constant: [-1, -200], dynamics: null },
    meshRenderFlags: 0,
    particleIsLocalOrientation: false,
    particleUVScrollRate: null,
    disableBackfaceCull: false,
    miscRenderFlags: 0,
    lifetime: 5,
    particleLifetime: 5,
    particleLinger: 0,
    emitterLinger: 0,
    timeBeforeFirstEmission: 0,
    rate: 0,
    blendMode: 1,
    pass: 0,
    importance: 0,
    alphaRef: 0,
    numFrames: null,
    texDiv: null,
    uvRotation: 0,
    emitterPosition: [0, 0, 0],
    spawnOffset: [0, 0, 0],
    spawnShape: null,
    birthScale0: { constant: [55, 600, 600], dynamics: null },
    scale0: null,
    birthRotation0: { constant: [-90, -90, 0], dynamics: null },
    rotation0: null,
    birthVelocity: null,
    birthOrbitalVelocity: null,
    birthDrag: null,
    worldAcceleration: null,
    birthRotationalVelocity0: null,
    bindWeight: null,
    attachBoneName: null,
    birthAcceleration: null,
    color: null,
    birthColor: null,
    colorLookUpScales: null,
    colorLookUpTypeX: 0,
    colorLookUpTypeY: 0,
    startFrame: null,
    isDirectionOriented: false,
    alphaErosion: null,
    distortionDefinition: null,
    trailBirthTilingSize: null,
    texture: 'x.tex',
    particleColorTexture: '',
    textureMult: null,
    birthUvScrollRate: null,
    birthUvOffset: null,
    meshPath: null,
    skeletonPath: null,
    animationPath: null,
    primitiveKind: 'arbitrary_quad',
    paletteDefinition: null,
    reflection: null,
    flexShape: null,
    uvScale: null,
    emitOffset: null,
    scalars: [],
  }
}

describe('executeMotionStrategies', () => {
  it('navmesh com normal inclinado: GroundProjected só snap Z (sem inclinar malha)', () => {
    const emitter = makeGroundEmitter()
    const pipeline = getComposablePipeline(emitter)
    const frame = computeEmitterFrameState(emitter, 0.01, 0, 1, { composablePipeline: pipeline })
    const baseRot = [...frame.rotation] as [number, number, number]

    const adjusted = applyMotionAdjustments(
      frame,
      executeMotionStrategies(pipeline, frame, {
        groundHitResolver: () => ({
          z: 0.12,
          normal: [0.35, 0.2, 0.85],
          fromMesh: true,
        }),
      }),
    )

    expect(adjusted.position[2]).toBeCloseTo(0.12, 4)
    expect(adjusted.rotation).toEqual(baseRot)
  })

  it('plano horizontal não altera rotação', () => {
    const emitter = makeGroundEmitter()
    const pipeline = getComposablePipeline(emitter)
    const frame = computeEmitterFrameState(emitter, 0.01, 0, 1, { composablePipeline: pipeline })
    const baseRot = [...frame.rotation] as [number, number, number]

    const adjusted = applyMotionAdjustments(
      frame,
      executeMotionStrategies(pipeline, frame, {
        groundHitResolver: () => ({
          z: 0.02,
          normal: [0, 0, 1],
          fromMesh: true,
        }),
      }),
    )

    expect(adjusted.rotation).toEqual(baseRot)
  })
})
