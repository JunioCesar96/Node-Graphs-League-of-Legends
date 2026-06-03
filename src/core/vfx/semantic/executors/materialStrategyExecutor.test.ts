import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from '../../vfxModel'
import { getComposablePipeline } from '../vfxRenderStrategy'
import { extractEmitterFeatures } from '../vfxEmitterFeatures'
import { executeMaterialStrategies } from './materialStrategyExecutor'

function makeEmitter(overrides: Partial<ParsedVfxEmitterFull>): ParsedVfxEmitterFull {
  const base: ParsedVfxEmitterFull = {
    name: 'test',
    isSingleParticle: false,
    isRandomStartFrame: false,
    isLocalOrientation: false,
    isUniformScale: false,
    isGroundLayer: false,
    useNavmeshMask: false,
    depthBiasFactors: null,
    meshRenderFlags: 0,
    colorRenderFlags: 0,
    isRotationEnabled: false,
    particleIsLocalOrientation: false,
    particleUVScrollRate: null,
    disableBackfaceCull: false,
    miscRenderFlags: 0,
    lifetime: 1,
    particleLifetime: 2,
    particleLinger: 0,
    emitterLinger: 0,
    timeBeforeFirstEmission: 0,
    rate: 1,
    blendMode: 1,
    pass: 0,
    importance: 0,
    alphaRef: 0,
    numFrames: null,
    texDiv: [5, 4],
    uvRotation: 0,
    emitterPosition: [0, 0, 0],
    spawnOffset: [0, 0, 0],
    spawnShape: null,
    birthScale0: { constant: [300, 1, 1], dynamics: null },
    scale0: null,
    birthRotation0: { constant: [0, 0, 0], dynamics: null },
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
    texture: '',
    particleColorTexture: '',
    textureMult: null,
    paletteDefinition: null,
    alphaErosion: null,
    reflection: null,
    distortionDefinition: null,
    primitiveKind: 'arbitrary_quad',
    meshPath: null,
    skeletonPath: null,
    animationPath: null,
    isDirectionOriented: false,
    flexShape: null,
    startFrame: null,
    birthUvScrollRate: null,
    birthUvOffset: null,
    trailBirthTilingSize: null,
    scalars: [],
  }
  return { ...base, ...overrides }
}

describe('executeMaterialStrategies', () => {
  it('fire_ring_red: flipbook via shaderFeatures, cols/rows do texDiv', () => {
    const emitter = makeEmitter({
      name: 'fire_ring_red',
      isGroundLayer: true,
      texDiv: [5, 4],
      birthScale0: { constant: [300, 1, 1], dynamics: null },
    })
    const pipeline = getComposablePipeline(emitter)
    const descriptor = executeMaterialStrategies({
      emitter,
      frame: {
        opacity: 1,
        color: [1, 1, 1, 1],
        spriteOffset: [2, 1],
        uvScroll: [0.1, 0],
        erosionDrive: 1,
        distortionDrive: 1,
      },
      pipeline,
      features: extractEmitterFeatures(emitter),
      textureUrl: '/tex.png',
      textureIsDds: false,
      colorTextureUrl: null,
      colorTextureIsDds: false,
      textureMultUrl: null,
      textureMultIsDds: false,
    })

    expect(descriptor.shaderFeatures.flipbook).toBe(true)
    expect(descriptor.spriteCols).toBe(5)
    expect(descriptor.spriteRows).toBe(4)
    expect(descriptor.geometryKind).toBe('ring')
  })

  it('ground + navmesh: polygonOffset e groundNavmeshClip', () => {
    const emitter = makeEmitter({
      name: 'cracks2',
      isGroundLayer: true,
      useNavmeshMask: true,
      birthScale0: { constant: [55, 600, 600], dynamics: null },
      birthRotation0: { constant: [-90, -90, 0], dynamics: null },
    })
    const pipeline = getComposablePipeline(emitter)
    const descriptor = executeMaterialStrategies({
      emitter,
      frame: {
        opacity: 1,
        color: [0, 0, 0, 1],
        spriteOffset: [0, 0],
        uvScroll: [0, 0],
        erosionDrive: 1,
        distortionDrive: 1,
      },
      pipeline,
      features: extractEmitterFeatures(emitter),
      textureUrl: null,
      textureIsDds: false,
      colorTextureUrl: null,
      colorTextureIsDds: false,
      textureMultUrl: null,
      textureMultIsDds: false,
    })

    expect(pipeline.traits).toContain('NavmeshGroundClip')
    expect(descriptor.shaderFeatures.groundNavmeshClip).toBe(true)
    expect(descriptor.polygonOffset).toBe(true)
  })

  it('distortion: activa feature e strength', () => {
    const emitter = makeEmitter({
      distortionDefinition: {
        distortion: 0.02,
        distortionMode: 0,
        normalMapTexture: 'ASSETS/foo_distort.tex',
      },
    })
    const pipeline = getComposablePipeline(emitter)
    const descriptor = executeMaterialStrategies({
      emitter,
      frame: {
        opacity: 1,
        color: [1, 1, 1, 1],
        spriteOffset: [0, 0],
        uvScroll: [0, 0],
        erosionDrive: 1,
        distortionDrive: 0.5,
      },
      pipeline,
      features: extractEmitterFeatures(emitter),
      textureUrl: '/a.png',
      textureIsDds: false,
      colorTextureUrl: null,
      colorTextureIsDds: false,
      textureMultUrl: null,
      textureMultIsDds: false,
      distortionTextureUrl: '/distort.png',
      distortionTextureIsDds: false,
    })

    expect(descriptor.shaderFeatures.distortion).toBe(true)
    expect(descriptor.distortionTextureUrl).toBe('/distort.png')
    expect(descriptor.distortionStrength).toBeGreaterThan(0)
  })

  it('uvRotation em plane activa margem segura', () => {
    const emitter = makeEmitter({
      primitiveKind: 'plane',
      uvRotation: 30,
      texDiv: [1, 1],
      birthScale0: { constant: [100, 100, 1], dynamics: null },
    })
    const pipeline = getComposablePipeline(emitter)
    const descriptor = executeMaterialStrategies({
      emitter,
      frame: {
        opacity: 1,
        color: [1, 1, 1, 1],
        spriteOffset: [0, 0],
        uvScroll: [0, 0],
        uvRotation: 0,
        erosionDrive: 1,
        distortionDrive: 1,
      },
      pipeline,
      features: extractEmitterFeatures(emitter),
      textureUrl: '/tex.png',
      textureIsDds: false,
      colorTextureUrl: null,
      colorTextureIsDds: false,
      textureMultUrl: null,
      textureMultIsDds: false,
    })

    expect(descriptor.geometryKind).toBe('plane')
    expect(descriptor.uvRotationSafeMargin).toBe(true)
    expect(descriptor.uvRotationSafeMarginG).toBeCloseTo(Math.SQRT2, 5)
  })

  it('tintRgba: Color × birthColor no material', () => {
    const emitter = makeEmitter({
      color: { kind: 'ValueColor', constant: [0.5, 0.25, 0.75, 1], dynamics: null },
      birthColor: { kind: 'ValueColor', constant: [0.8, 0.8, 0.8, 0.5], dynamics: null },
      particleColorTexture: 'ASSETS/color.tex',
      colorRenderFlags: 1,
    })
    const pipeline = getComposablePipeline(emitter)
    const descriptor = executeMaterialStrategies({
      emitter,
      frame: {
        opacity: 1,
        color: [0.4, 0.2, 0.6, 0.5],
        spriteOffset: [0, 0],
        uvScroll: [0, 0],
        erosionDrive: 1,
        distortionDrive: 1,
      },
      pipeline,
      features: extractEmitterFeatures(emitter),
      textureUrl: '/tex.png',
      textureIsDds: false,
      colorTextureUrl: '/color.png',
      colorTextureIsDds: false,
      textureMultUrl: null,
      textureMultIsDds: false,
      renderOptions: { particleNormalized: 0 },
    })

    expect(descriptor.tintRgba[0]).toBeCloseTo(0.4, 4)
    expect(descriptor.tintRgba[3]).toBeCloseTo(0.5, 4)
    expect(descriptor.colorMultiply).toBe(true)
  })

  it('uvRotation em ring não activa margem segura', () => {
    const emitter = makeEmitter({
      name: 'fire_ring_red',
      isGroundLayer: true,
      uvRotation: 45,
    })
    const pipeline = getComposablePipeline(emitter)
    const descriptor = executeMaterialStrategies({
      emitter,
      frame: {
        opacity: 1,
        color: [1, 1, 1, 1],
        spriteOffset: [0, 0],
        uvScroll: [0, 0],
        uvRotation: 0,
        erosionDrive: 1,
        distortionDrive: 1,
      },
      pipeline,
      features: extractEmitterFeatures(emitter),
      textureUrl: '/tex.png',
      textureIsDds: false,
      colorTextureUrl: null,
      colorTextureIsDds: false,
      textureMultUrl: null,
      textureMultIsDds: false,
    })

    expect(descriptor.geometryKind).toBe('ring')
    expect(descriptor.uvRotationSafeMargin).toBe(false)
  })
})
