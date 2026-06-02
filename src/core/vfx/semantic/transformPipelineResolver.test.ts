import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from '../vfxModel'
import { extractEmitterFeatures } from './vfxEmitterFeatures'
import { getComposablePipeline } from './vfxRenderStrategy'
import { resolveTransformPipeline } from './transformPipelineResolver'

function makeEmitter(overrides: Partial<ParsedVfxEmitterFull>): ParsedVfxEmitterFull {
  return {
    name: 'test',
    isSingleParticle: false,
    isRandomStartFrame: false,
    isLocalOrientation: false,
    isRotationEnabled: false,
    isUniformScale: false,
    isGroundLayer: false,
    useNavmeshMask: false,
    depthBiasFactors: null,
    meshRenderFlags: 0,
    particleIsLocalOrientation: false,
    particleUVScrollRate: null,
    disableBackfaceCull: false,
    miscRenderFlags: 0,
    lifetime: 1,
    particleLifetime: 1,
    particleLinger: 0,
    emitterLinger: 0,
    timeBeforeFirstEmission: 0,
    rate: 1,
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
    birthScale0: null,
    scale0: null,
    birthRotation0: null,
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
    texture: '',
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
    ...overrides,
  }
}

describe('resolveTransformPipeline', () => {
  it('ground arbitrary_quad → GroundAligned + GroundPlane + GroundBasisFirst', () => {
    const emitter = makeEmitter({
      isGroundLayer: true,
      primitiveKind: 'arbitrary_quad',
    })
    const composable = getComposablePipeline(emitter)
    const pipeline = resolveTransformPipeline(emitter, composable)
    expect(pipeline.orientationMode).toBe('GroundAligned')
    expect(pipeline.scaleSpace).toBe('GroundPlane')
    expect(pipeline.transformOrder).toBe('GroundBasisFirst')
    expect(pipeline.billboardMode).toBe('none')
  })

  it('mesh primitive → MeshAttached + ScaleThenOrient', () => {
    const emitter = makeEmitter({ primitiveKind: 'mesh', meshPath: 'foo.scb' })
    const composable = getComposablePipeline(emitter)
    const pipeline = resolveTransformPipeline(emitter, composable)
    expect(pipeline.orientationMode).toBe('MeshAttached')
    expect(pipeline.transformOrder).toBe('ScaleThenOrient')
  })

  it('bindWeight → EmitterAttached + useLeagueMatrixP', () => {
    const emitter = makeEmitter({
      bindWeight: { constant: 1, dynamics: null },
      attachBoneName: 'L_Hand',
    })
    const pipeline = resolveTransformPipeline(emitter, getComposablePipeline(emitter))
    expect(pipeline.simulationSpace).toBe('EmitterAttached')
    expect(pipeline.useLeagueMatrixP).toBe(true)
  })

  it('direction oriented → DirectionAligned + velocity billboard', () => {
    const emitter = makeEmitter({ isDirectionOriented: true, primitiveKind: 'ray' })
    const features = extractEmitterFeatures(emitter)
    expect(features.directionOriented).toBe(true)
    const pipeline = resolveTransformPipeline(emitter, getComposablePipeline(emitter))
    expect(pipeline.orientationMode).toBe('DirectionAligned')
    expect(pipeline.billboardMode).toBe('velocity')
  })
})
