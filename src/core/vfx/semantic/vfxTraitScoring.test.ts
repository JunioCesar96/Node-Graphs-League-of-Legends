import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from '../vfxModel'
import { extractEmitterFeatures } from './vfxEmitterFeatures'
import { activeTraitsFromScores, resolveEmitterTraits, TRAIT_ACTIVATION_THRESHOLD } from './vfxTraitScoring'

function makeGroundEmitter(
  overrides: Partial<ParsedVfxEmitterFull> & Pick<ParsedVfxEmitterFull, 'name'>,
): ParsedVfxEmitterFull {
  const base: ParsedVfxEmitterFull = {
    name: overrides.name,
    isSingleParticle: false,
    isRandomStartFrame: false,
    isLocalOrientation: false,
    isUniformScale: false,
    isGroundLayer: true,
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
    birthScale0: { constant: [55, 600, 600], dynamics: null },
    scale0: null,
    birthRotation0: { constant: [-90, -90, 0], dynamics: null },
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

describe('resolveEmitterTraits multi-label', () => {
  it('cracks2: GroundProjected activo', () => {
    const features = extractEmitterFeatures(makeGroundEmitter({ name: 'cracks2' }))
    const resolved = resolveEmitterTraits(features)
    expect(resolved.active).toContain('GroundProjected')
    expect(resolved.geometryIntent).toBe('Decal')
    expect(features.isDecalLike).toBe(true)
  })

  it('fire_ring_red: GroundProjected + FlipbookAnimated', () => {
    const features = extractEmitterFeatures(
      makeGroundEmitter({
        name: 'fire_ring_red',
        birthScale0: { constant: [300, 1, 1], dynamics: null },
        numFrames: 20,
        texDiv: [5, 4],
      }),
    )
    const resolved = resolveEmitterTraits(features)
    expect(resolved.active).toContain('GroundProjected')
    expect(resolved.active).toContain('FlipbookAnimated')
    expect(resolved.profile.geometry.kind).toBe('GroundRing')
  })

  it('hoop2: OrbitalMotion inactivo (sistema removido)', () => {
    const features = extractEmitterFeatures(
      makeGroundEmitter({
        name: 'hoop2',
        isGroundLayer: false,
        birthOrbitalVelocity: { constant: [0, 2, 0], dynamics: null },
        primitiveKind: 'arbitrary_quad',
      }),
    )
    const resolved = resolveEmitterTraits(features)
    expect(features.orbitalVelocity).toBe(false)
    expect(resolved.active).not.toContain('OrbitalMotion')
  })

  it('activeTraitsFromScores respeita threshold', () => {
    const scores = {
      GroundProjected: TRAIT_ACTIVATION_THRESHOLD,
      FlipbookAnimated: TRAIT_ACTIVATION_THRESHOLD - 1,
      AdditiveBlended: 0,
      AlphaBlended: 0,
      DirectionOriented: 0,
      ErosionDissolve: 0,
      UvScrollFlow: 0,
      PaletteGradient: 0,
      TextureMultLayered: 0,
      BeamExtruded: 0,
      TrailRibbon: 0,
      BillboardCamera: 0,
      SoftParticle: 0,
      ShockwaveRadial: 0,
      MeshBased: 0,
      OrbitalMotion: 0,
      RotationalSpin: 0,
      VelocityMotion: 0,
    }
    expect(activeTraitsFromScores(scores)).toEqual(['GroundProjected'])
  })
})
