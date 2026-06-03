import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from './vfxModel'
import { computeOrbitalDebugRingParams } from './vfxOrbitalDebug'

function hoop2Like(): ParsedVfxEmitterFull {
  return {
    name: 'hoop2',
    isSingleParticle: false,
    isRandomStartFrame: false,
    isLocalOrientation: false,
    isUniformScale: false,
    isGroundLayer: false,
    disableBackfaceCull: false,
    miscRenderFlags: 0,
    lifetime: 10,
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
    spawnShape: {
      kind: 'legacy',
      emitOffset: { constant: [40, 0, 0], dynamics: null },
      emitRotationAngle: null,
      emitRotationAxis: [0, 1, 0],
    },
    birthScale0: null,
    scale0: null,
    birthRotation0: null,
    birthOrbitalVelocity: { constant: [0, 2, 0], dynamics: null },
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

describe('computeOrbitalDebugRingParams', () => {
  it('anel com raio ~0.4 para hoop2 e vfxScale 0.01', () => {
    const ring = computeOrbitalDebugRingParams(hoop2Like(), 5, 0.01)
    expect(ring).not.toBeNull()
    expect(ring!.radius).toBeCloseTo(0.4, 1)
    expect(ring!.ringRotation[1]).toBeCloseTo(Math.PI / 2, 3)
  })

  it('sem ω retorna null', () => {
    const emitter = hoop2Like()
    emitter.birthOrbitalVelocity = null
    expect(computeOrbitalDebugRingParams(emitter, 5, 0.01)).toBeNull()
  })
})
