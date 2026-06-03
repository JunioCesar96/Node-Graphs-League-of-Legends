import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from '../vfxModel'
import { parseRitualVfx, parseRitualVfxCatalog } from '../ritualParseVfx'
import { deriveGroundScaleKind, isFlipbookTexDiv } from './vfxEmitterFeatures'
import { classifyEmitter, resolveEmitterSemanticAnalysis } from './emitterSemanticClassifier'

const luxFixturePath = join(dirname(fileURLToPath(import.meta.url)), '../../../../_lux_q_hoop.fixture.md')

function loadLuxQMis() {
  return parseRitualVfxCatalog(readFileSync(luxFixturePath, 'utf8')).entries[0]!.system
}

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

describe('deriveGroundScaleKind (paridade vfxWebAnimation)', () => {
  it('cracks2: decal', () => {
    expect(deriveGroundScaleKind([55, 600, 600])).toBe('decal')
  })

  it('fire_ring_red: flipbookSquare por texDiv {5,4}', () => {
    expect(deriveGroundScaleKind([300, 1, 1], [5, 4])).toBe('flipbookSquare')
  })

  it('strip {10,300,1} sem spritesheet multi-célula', () => {
    expect(deriveGroundScaleKind([10, 300, 1])).toBe('strip')
    expect(deriveGroundScaleKind([10, 300, 1], [1, 1])).toBe('strip')
  })

  it('isFlipbookTexDiv', () => {
    expect(isFlipbookTexDiv([5, 4])).toBe(true)
    expect(isFlipbookTexDiv([1, 1])).toBe(false)
  })
})

describe('classifyEmitter — geometria semântica', () => {
  it('cracks2 → GroundDecal + groundScaleKind decal', () => {
    const emitter = makeGroundEmitter({ name: 'cracks2' })
    const profile = classifyEmitter(emitter)
    expect(profile.geometry.kind).toBe('GroundDecal')
    expect(profile.groundScaleKind).toBe('decal')
    expect(profile.geometry.score).toBeGreaterThan(0)
  })

  it('fire_ring_red → GroundRing + Flipbook + flipbookSquare + traits compostos', () => {
    const emitter = makeGroundEmitter({
      name: 'fire_ring_red',
      birthScale0: { constant: [300, 1, 1], dynamics: null },
      numFrames: 20,
      texDiv: [5, 4],
    })
    const analysis = resolveEmitterSemanticAnalysis(emitter)
    const profile = analysis.profile
    expect(profile.geometry.kind).toBe('GroundRing')
    expect(profile.material.kind).toBe('Flipbook')
    expect(profile.groundScaleKind).toBe('flipbookSquare')
    expect(analysis.active).toContain('GroundProjected')
    expect(analysis.active).toContain('FlipbookAnimated')
  })

  it('Lux rays → Beam + BeamExtruded trait', () => {
    const rays = loadLuxQMis().emitters.find((e) => e.name === 'rays')!
    const analysis = resolveEmitterSemanticAnalysis(rays)
    expect(analysis.profile.geometry.kind).toBe('Beam')
    expect(analysis.active).toContain('BeamExtruded')
  })

  it('Lux Trail5 → Trail + TrailRibbon trait', () => {
    const trail = loadLuxQMis().emitters.find((e) => e.name === 'Trail5')!
    const analysis = resolveEmitterSemanticAnalysis(trail)
    expect(analysis.profile.geometry.kind).toBe('Trail')
    expect(analysis.active).toContain('TrailRibbon')
  })

  it('Lux END_Ground_Core → GroundDecal', () => {
    const core = loadLuxQMis().emitters.find((e) => e.name === 'END_Ground_Core')!
    const profile = classifyEmitter(core)
    expect(profile.geometry.kind).toBe('GroundDecal')
    expect(profile.groundScaleKind).toBe('decal')
  })

  it('hoop1 → Billboard (não usa nome)', () => {
    const hoop1 = loadLuxQMis().emitters.find((e) => e.name === 'hoop1')!
    const profile = classifyEmitter(hoop1)
    expect(['Billboard', 'DirectionBillboard']).toContain(profile.geometry.kind)
    expect(profile.material.kind).toBe('Flipbook')
  })
})

describe('classifyEmitter — sem referência a texture/name nas regras', () => {
  it('emitter anónimo com mesma assinatura que cracks2 classifica igual', () => {
    const emitter = makeGroundEmitter({
      name: 'x',
      texture: 'totally_unrelated_path.xyz',
    })
    const profile = classifyEmitter(emitter)
    expect(profile.geometry.kind).toBe('GroundDecal')
  })
})
