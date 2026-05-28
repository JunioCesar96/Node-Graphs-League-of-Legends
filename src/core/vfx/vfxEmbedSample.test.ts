import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from './vfxModel'
import { sampleDynamicsVec3, sampleDynamicsVec4 } from './vfxEmbedSample'
import {
  applyOrbitalRotationLol,
  applyOrbitalStepLol,
  computeParticleSpawnOffsetLol,
  integrateOrbitalRotationLol,
  resolveOrbitalOmegaLol,
} from './vfxSpawnShape'
import { DEFAULT_VFX_FPS } from './vfxWebAnimation'

function orbitalEmitter(omegaDynamics: ParsedVfxEmitterFull['birthOrbitalVelocity']): ParsedVfxEmitterFull {
  return {
    name: 'orbital_test',
    isSingleParticle: false,
    isRandomStartFrame: false,
    isLocalOrientation: false,
    isUniformScale: false,
    isGroundLayer: false,
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
    texDiv: null,
    uvRotation: 0,
    emitterPosition: [0, 0, 0],
    spawnOffset: [0, 0, 0],
    spawnShape: {
      kind: 'legacy',
      emitOffset: { constant: [40, 0, 0], dynamics: null },
      emitRotationAngle: null,
      emitRotationAxis: [0, 1, 0],
    },
    birthScale0: null,
    scale0: null,
    birthRotation0: null,
    birthOrbitalVelocity: omegaDynamics,
    birthVelocity: null,
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
}

describe('sampleDynamicsVec4 — ValueColor', () => {
  it('interpola vec4 entre keyframes', () => {
    const embed = {
      constant: [1, 0, 0, 1],
      dynamics: {
        times: [0, 1],
        values: [
          [1, 0, 0, 1],
          [0, 1, 0, 0.5],
        ],
        probabilityTables: [],
      },
    }
    expect(sampleDynamicsVec4(embed, 0)).toEqual([1, 0, 0, 1])
    expect(sampleDynamicsVec4(embed, 0.5)).toEqual([0.5, 0.5, 0, 0.75])
    expect(sampleDynamicsVec4(embed, 1)).toEqual([0, 1, 0, 0.5])
  })

  it('usa constant sem dynamics', () => {
    const embed = { constant: [0.847, 0.847, 0.847, 1], dynamics: null }
    expect(sampleDynamicsVec4(embed, 0.5)).toEqual([0.847, 0.847, 0.847, 1])
  })
})

describe('sampleDynamicsVec3 — birthOrbitalVelocity', () => {
  it('interpola ω entre keyframes', () => {
    const embed = {
      constant: [0, 2, 0],
      dynamics: {
        times: [0, 1],
        values: [
          [0, 2, 0],
          [0, 6, 0],
        ],
        probabilityTables: [],
      },
    }
    expect(sampleDynamicsVec3(embed, 0, [0, 0, 0])).toEqual([0, 2, 0])
    expect(sampleDynamicsVec3(embed, 0.5, [0, 0, 0])).toEqual([0, 4, 0])
    expect(sampleDynamicsVec3(embed, 1, [0, 0, 0])).toEqual([0, 6, 0])
  })
})

describe('integrateOrbitalRotationLol — por frame', () => {
  it('passos frame a frame equivalem à integração contínua (ω constante)', () => {
    const emitter = orbitalEmitter({
      constant: [0, 0, 2],
      dynamics: null,
    })
    emitter.spawnShape = {
      kind: 'legacy',
      emitOffset: { constant: [40, 0, 0], dynamics: null },
      emitRotationAngle: null,
      emitRotationAxis: [0, 1, 0],
    }

    const motionTime = 1
    const integrated = integrateOrbitalRotationLol([40, 0, 0], emitter, 5, motionTime)

    const steps = Math.max(1, Math.floor(motionTime * DEFAULT_VFX_FPS))
    let frameByFrame: [number, number, number] = [40, 0, 0]
    for (let step = 0; step < steps; step++) {
      const omega = resolveOrbitalOmegaLol(emitter, 5, 0, step === 0)
      frameByFrame = applyOrbitalStepLol(frameByFrame, omega)
    }

    expect(frameByFrame[0]).toBeCloseTo(integrated[0], 3)
    expect(frameByFrame[2]).toBeCloseTo(integrated[2], 3)
    expect(Math.hypot(integrated[0], integrated[2])).toBeCloseTo(40, 1)
  })

  it('ω cresce ao longo da vida: arco integrado entre ω(0)×t e ω(1)×t', () => {
    const emitter = orbitalEmitter({
      constant: [0, 0, 2],
      dynamics: {
        times: [0, 1],
        values: [
          [0, 0, 2],
          [0, 0, 6],
        ],
        probabilityTables: [],
      },
    })
    emitter.particleLifetime = 1

    const integrated = integrateOrbitalRotationLol([40, 0, 0], emitter, 5, 1)
    const arcIntegrated = Math.hypot(integrated[0] - 40, integrated[2])
    const frames = Math.floor(1 * DEFAULT_VFX_FPS)
    const arcAtOmega0 = Math.hypot(
      applyOrbitalRotationLol([40, 0, 0], [0, 2, 0], frames)[0] - 40,
      applyOrbitalRotationLol([40, 0, 0], [0, 2, 0], frames)[2],
    )
    const arcAtOmega1 = Math.hypot(
      applyOrbitalRotationLol([40, 0, 0], [0, 6, 0], frames)[0] - 40,
      applyOrbitalRotationLol([40, 0, 0], [0, 6, 0], frames)[2],
    )

    expect(arcIntegrated).toBeGreaterThan(arcAtOmega0)
    expect(arcIntegrated).toBeLessThan(arcAtOmega1)
    expect(Math.hypot(integrated[0], integrated[2])).toBeCloseTo(40, 1)
  })
})

describe('computeParticleSpawnOffsetLol — ω animado', () => {
  it('ω com keyframes: arco cresce com motionTime (amostragem por frame)', () => {
    const emitter = orbitalEmitter({
      constant: [0, 0, 2],
      dynamics: {
        times: [0, 1],
        values: [
          [0, 0, 2],
          [0, 0, 6],
        ],
        probabilityTables: [],
      },
    })
    emitter.particleLifetime = 1

    const atHalf = computeParticleSpawnOffsetLol(emitter, 5, 0.5, null, 0)
    const atFull = computeParticleSpawnOffsetLol(emitter, 5, 1, null, 0)
    const arcHalf = Math.hypot(atHalf[0] - 40, atHalf[2])
    const arcFull = Math.hypot(atFull[0] - 40, atFull[2])
    expect(arcFull).toBeGreaterThan(arcHalf)
    expect(Math.hypot(atFull[0], atFull[2])).toBeCloseTo(40, 1)
  })
})
