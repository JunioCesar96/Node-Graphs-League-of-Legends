import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from './vfxModel'
import {
  applyOrbitalRotationLol,
  applyOrbitalStepLol,
  dominantOrbitalComponentIndex,
  integrateOrbitalRotationLol,
  normalizeEditorVec3XzyToXyz,
  orbitalRotationAxisForComponent,
  orbitalSimulationFrameCount,
  resolveOrbitalOmegaAccumulatedDeg,
} from './vfxOrbitalMotion'
import { DEFAULT_VFX_FPS } from './vfxWebAnimation'

const BASE: [number, number, number] = [40, 0, 0]

describe('vfxOrbitalMotion — eixos Orbita', () => {
  it('ωx roda em torno de Y (plano XZ)', () => {
    const rotated = applyOrbitalStepLol(BASE, [5, 0, 0])
    expect(Math.hypot(rotated[0], rotated[2])).toBeCloseTo(40, 1)
    expect(Math.abs(rotated[1] - BASE[1])).toBeLessThan(0.01)
    expect(rotated[0]).toBeLessThan(40)
  })

  it('ωy roda em torno de Y (plano XZ)', () => {
    const rotated = applyOrbitalStepLol(BASE, [0, 5, 0])
    expect(Math.hypot(rotated[0], rotated[2])).toBeCloseTo(40, 1)
    expect(Math.abs(rotated[1] - BASE[1])).toBeLessThan(0.01)
  })

  it('ωz roda em torno de X (plano YZ)', () => {
    const offsetY: [number, number, number] = [0, 40, 0]
    const rotated = applyOrbitalStepLol(offsetY, [0, 0, 5])
    expect(Math.hypot(rotated[1], rotated[2])).toBeCloseTo(40, 1)
    expect(Math.abs(rotated[0] - offsetY[0])).toBeLessThan(0.01)
  })

  it('eixos mapeados: X/Y → Y, Z → X', () => {
    expect(orbitalRotationAxisForComponent(0)).toEqual([0, 1, 0])
    expect(orbitalRotationAxisForComponent(1)).toEqual([0, 1, 0])
    expect(orbitalRotationAxisForComponent(2)).toEqual([1, 0, 0])
  })
})

describe('vfxOrbitalMotion — °/frame', () => {
  it('1s de simulação = 30 passos com ωY(editor)=2°/frame mapeia para eixo X', () => {
    const emitter = minimalEmitter({ constant: [0, 2, 0], dynamics: null })
    const atOne = integrateOrbitalRotationLol(BASE, emitter, 5, 1)
    expect(Math.abs(atOne[0] - BASE[0])).toBeLessThan(0.1)
    expect(Math.hypot(atOne[0], atOne[1], atOne[2])).toBeCloseTo(40, 1)
  })

  it('ω acumulado: 12°/frame × 60 frames = 720°', () => {
    const emitter = minimalEmitter({ constant: [0, 12, 0], dynamics: null })
    const acc = resolveOrbitalOmegaAccumulatedDeg(emitter, 5, 2, 1)
    expect(acc[2]).toBeCloseTo(12 * orbitalSimulationFrameCount(2), 1)
    expect(orbitalSimulationFrameCount(2)).toBe(Math.floor(2 * DEFAULT_VFX_FPS))
  })

  it('applyOrbitalRotationLol com 30 frames equivale a integrate 1s', () => {
    const omega: [number, number, number] = [0, 2, 0]
    let manual = BASE
    for (let i = 0; i < 30; i++) manual = applyOrbitalStepLol(manual, omega)
    const batch = applyOrbitalRotationLol(BASE, omega, 30)
    expect(batch[0]).toBeCloseTo(manual[0], 3)
    expect(batch[2]).toBeCloseTo(manual[2], 3)
  })
})

function minimalEmitter(
  birthOrbitalVelocity: ParsedVfxEmitterFull['birthOrbitalVelocity'],
): ParsedVfxEmitterFull {
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
    spawnShape: null,
    birthScale0: null,
    scale0: null,
    birthRotation0: null,
    birthOrbitalVelocity,
    birthVelocity: null,
    birthDrag: null,
    worldAcceleration: null,
    birthRotationalVelocity0: null,
    rotation0: null,
    birthAcceleration: null,
    color: null,
    birthColor: null,
    bindWeight: null,
    attachBoneName: null,
    flexShape: null,
    distortionDefinition: null,
    alphaErosion: null,
    particleScroll: null,
    isDirectionOriented: false,
    useNavmeshMask: false,
  } as ParsedVfxEmitterFull
}

describe('dominantOrbitalComponentIndex', () => {
  it('escolhe maior componente absoluto', () => {
    expect(dominantOrbitalComponentIndex([0, 12, 0])).toBe(1)
    expect(dominantOrbitalComponentIndex([3, 1, 2])).toBe(0)
  })
})

describe('normalizeEditorVec3XzyToXyz', () => {
  it('converte {X,Z,Y} do editor para {X,Y,Z} interno', () => {
    expect(normalizeEditorVec3XzyToXyz([1, 2, 3])).toEqual([1, 3, 2])
  })
})
