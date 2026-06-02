import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from './vfxModel'
import { computeParticleTransform } from './vfxTransformEngine'
import { getComposablePipeline } from './semantic/vfxRenderStrategy'
import { resolveTransformPipeline } from './semantic/transformPipelineResolver'

function makeGroundEmitter(): ParsedVfxEmitterFull {
  return {
    name: 'cracks2',
    isSingleParticle: true,
    isRandomStartFrame: false,
    isLocalOrientation: false,
    isRotationEnabled: false,
    isUniformScale: true,
    isGroundLayer: true,
    useNavmeshMask: true,
    depthBiasFactors: null,
    meshRenderFlags: 0,
    particleIsLocalOrientation: false,
    particleUVScrollRate: null,
    disableBackfaceCull: false,
    miscRenderFlags: 1,
    lifetime: 1,
    particleLifetime: 11,
    particleLinger: 0.4,
    emitterLinger: 0,
    timeBeforeFirstEmission: 0,
    rate: 1,
    blendMode: 1,
    pass: 2,
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
    texture: 'tex',
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

describe('computeParticleTransform', () => {
  it('cracks2: escala remap 600×600 e pipeline ground', () => {
    const emitter = makeGroundEmitter()
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)
    const state = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })
    expect(state.transformPipeline.transformOrder).toBe('GroundBasisFirst')
    expect(state.scale[0]).toBeCloseTo(6, 0)
    expect(state.scale[1]).toBeCloseTo(6, 0)
    expect(state.scale[2]).toBe(1)
    expect(state.rotation).toEqual([0, 0, 0])
  })

  it('cracks2: sem drift em X/Z ao longo do tempo (ground sem worldAcceleration)', () => {
    const emitter = makeGroundEmitter()
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)
    const base = {
      emitter,
      vfxScale: 0.01,
      particleNormalized: 0,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    }
    const at0 = computeParticleTransform({ ...base, particleTime: 0 })
    const at5 = computeParticleTransform({ ...base, particleTime: 5 })
    const at11 = computeParticleTransform({ ...base, particleTime: 11 })

    expect(at5.position[0]).toBeCloseTo(at0.position[0], 5)
    expect(at5.position[2]).toBeCloseTo(at0.position[2], 5)
    expect(at11.position[0]).toBeCloseTo(at0.position[0], 5)
    expect(at11.position[2]).toBeCloseTo(at0.position[2], 5)
  })

  it('birthVelocity afeta deslocamento sem alterar rotação por orbital', () => {
    const emitter = makeGroundEmitter()
    emitter.isGroundLayer = false
    emitter.birthVelocity = { constant: [0, 45, 0], dynamics: null }
    emitter.spawnOffset = [40, 0, 0]
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)

    const at0 = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 0,
      particleNormalized: 0,
      seed: 7,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })
    const at1 = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 1,
      particleNormalized: 1,
      seed: 7,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })

    expect(Math.hypot(at1.position[0] - at0.position[0], at1.position[1] - at0.position[1], at1.position[2] - at0.position[2])).toBeGreaterThan(0.05)
    expect(at1.rotationLolDeg).toEqual(at0.rotationLolDeg)
  })

  it('lockMotion congela orbital e birthVelocity', () => {
    const emitter = makeGroundEmitter()
    emitter.isGroundLayer = false
    emitter.birthVelocity = { constant: [0, 45, 0], dynamics: null }
    emitter.spawnOffset = [40, 0, 0]
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)

    const locked0 = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 0,
      particleNormalized: 0,
      seed: 7,
      lockMotion: true,
      composablePipeline: composable,
      transformPipeline,
    })
    const locked1 = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 1,
      particleNormalized: 1,
      seed: 7,
      lockMotion: true,
      composablePipeline: composable,
      transformPipeline,
    })

    expect(locked1.position[0]).toBeCloseTo(locked0.position[0], 5)
    expect(locked1.position[1]).toBeCloseTo(locked0.position[1], 5)
    expect(locked1.position[2]).toBeCloseTo(locked0.position[2], 5)
    expect(locked1.rotationLolDeg[0]).toBeCloseTo(locked0.rotationLolDeg[0], 5)
    expect(locked1.rotationLolDeg[1]).toBeCloseTo(locked0.rotationLolDeg[1], 5)
    expect(locked1.rotationLolDeg[2]).toBeCloseTo(locked0.rotationLolDeg[2], 5)
  })

  it('birthVelocity usa apenas Z do editor {X,Z,Y}', () => {
    const baseEmitter = makeGroundEmitter()
    baseEmitter.isGroundLayer = false
    baseEmitter.spawnOffset = [0, 0, 0]
    const composable = getComposablePipeline(baseEmitter)
    const transformPipeline = resolveTransformPipeline(baseEmitter, composable)

    const withX = { ...baseEmitter, birthVelocity: { constant: [45, 0, 0], dynamics: null } }
    const withZ = { ...baseEmitter, birthVelocity: { constant: [0, 45, 0], dynamics: null } }
    const withY = { ...baseEmitter, birthVelocity: { constant: [0, 0, 45], dynamics: null } }

    const xAt0 = computeParticleTransform({
      emitter: withX,
      vfxScale: 0.01,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })
    const xAt1 = computeParticleTransform({
      emitter: withX,
      vfxScale: 0.01,
      particleTime: 1,
      particleNormalized: 1,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })
    expect(xAt1.position[0]).toBeCloseTo(xAt0.position[0], 5)
    expect(xAt1.position[1]).toBeCloseTo(xAt0.position[1], 5)
    expect(xAt1.position[2]).toBeCloseTo(xAt0.position[2], 5)

    const zAt0 = computeParticleTransform({
      emitter: withZ,
      vfxScale: 0.01,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })
    const zAt1 = computeParticleTransform({
      emitter: withZ,
      vfxScale: 0.01,
      particleTime: 1,
      particleNormalized: 1,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })
    expect(zAt1.position[0]).toBeCloseTo(zAt0.position[0], 5)
    expect(zAt1.position[1]).toBeCloseTo(zAt0.position[1], 5)
    expect(Math.abs(zAt1.position[2] - zAt0.position[2])).toBeGreaterThan(0.05)

    const yAt0 = computeParticleTransform({
      emitter: withY,
      vfxScale: 0.01,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })
    const yAt1 = computeParticleTransform({
      emitter: withY,
      vfxScale: 0.01,
      particleTime: 1,
      particleNormalized: 1,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })
    expect(yAt1.position[0]).toBeCloseTo(yAt0.position[0], 5)
    expect(yAt1.position[1]).toBeCloseTo(yAt0.position[1], 5)
    expect(yAt1.position[2]).toBeCloseTo(yAt0.position[2], 5)
  })

  it('matrix44 move só XY e habilita movimento sem birthVelocity', () => {
    const emitter = makeGroundEmitter()
    emitter.isGroundLayer = false
    emitter.birthVelocity = null
    const emitterMatrix = {
      ...emitter,
      scalars: [['matrix44', 'mat4', '1 0 0 0 0 1 0 0 0 0 1 0 10 20 0 1']] as [string, string, string][],
    }
    const composable = getComposablePipeline(emitterMatrix)
    const transformPipeline = resolveTransformPipeline(emitter, composable)

    const base = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 1,
      particleNormalized: 1,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })
    const withMatrix = computeParticleTransform({
      emitter: emitterMatrix,
      vfxScale: 0.01,
      particleTime: 1,
      particleNormalized: 1,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })

    expect(withMatrix.positionLol[0]).not.toBeCloseTo(base.positionLol[0], 5)
    expect(withMatrix.positionLol[1]).not.toBeCloseTo(base.positionLol[1], 5)
    expect(withMatrix.positionLol[2]).toBeCloseTo(base.positionLol[2], 5)
  })

  it('circulo_magico: ritual {-90,-90,0} + ω Y mantém facing ground e rotationLol ritual', () => {
    const emitter = makeGroundEmitter()
    emitter.name = 'circulo_magico_sparks'
    emitter.isGroundLayer = false
    emitter.birthScale0 = { constant: [256, 256, 7], dynamics: null }
    emitter.birthOrbitalVelocity = { constant: [0, 12, 0], dynamics: null }
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)

    expect(composable.profile).toBeDefined()
    expect(transformPipeline.useLeagueMatrixP).toBe(true)

    const state = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })

    expect(state.planeFacing).toBe('ground')
    expect(state.rotationLolDeg[0]).toBeCloseTo(-90, 0)
    expect(state.rotationLolDeg[1]).toBeCloseTo(-90, 0)
    expect(state.rotationViewLolDeg[0]).toBeCloseTo(0, 0)
    expect(state.rotationViewLolDeg[1]).toBeCloseTo(0, 0)
    expect(state.rotationViewLolDeg[2]).toBeCloseTo(0, 0)
    expect(state.birthRotationBaselineLol).toEqual([-90, -90, 0])
    expect(state.worldMatrix?.length).toBe(16)
  })

  it('birthRotation LoL desligado: view igual ao ritual sem subtrair baseline', () => {
    const emitter = makeGroundEmitter()
    emitter.isGroundLayer = false
    emitter.birthRotation0 = { constant: [-90, -90, 0], dynamics: null }
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)

    const state = computeParticleTransform({
      emitter,
      vfxScale: 1,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
      birthRotationLoLEnabled: false,
    })

    expect(state.rotationViewLolDeg[0]).toBeCloseTo(-90, 0)
    expect(state.rotationViewLolDeg[1]).toBeCloseTo(-90, 0)
    expect(state.rotationViewLolDeg[2]).toBeCloseTo(0, 0)
  })

  it('birthOrbitalVelocity em plane: compensa escala por √2', () => {
    const emitter = makeGroundEmitter()
    emitter.isGroundLayer = false
    emitter.primitiveKind = 'plane'
    emitter.birthScale0 = { constant: [100, 100, 1], dynamics: null }
    emitter.birthOrbitalVelocity = null

    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)

    const base = computeParticleTransform({
      emitter,
      vfxScale: 1,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })

    emitter.birthOrbitalVelocity = { constant: [0, 0, 12], dynamics: null }
    const withOrbital = computeParticleTransform({
      emitter,
      vfxScale: 1,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
    })

    const g = Math.SQRT2
    expect(withOrbital.scale[0]).toBeCloseTo(base.scale[0] / g, 4)
    expect(withOrbital.scale[1]).toBeCloseTo(base.scale[1] / g, 4)
    expect(withOrbital.scale[2]).toBe(base.scale[2])
  })
})
