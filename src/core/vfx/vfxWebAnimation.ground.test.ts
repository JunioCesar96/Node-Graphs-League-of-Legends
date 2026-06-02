import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from './vfxModel'
import {
  classifyLoLGroundQuadScale,
  computeEmitterFrameState,
  isFlipbookTexDiv,
  remapLoLQuadScaleForPlane,
} from './vfxWebAnimation'
import { parseRitualVfx } from './ritualParseVfx'
import { birthRotationGroundInPlaneEuler } from './vfxPrimitives'
import { parseRitualVfxCatalog } from './ritualParseVfx'

const previewPath = join(dirname(fileURLToPath(import.meta.url)), '../../../_preview.md')
const luxFixturePath = join(dirname(fileURLToPath(import.meta.url)), '../../../_lux_q_hoop.fixture.md')

function loadLuxQMis() {
  const catalog = parseRitualVfxCatalog(readFileSync(luxFixturePath, 'utf8'))
  return catalog.entries[0]!.system
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

describe('isFlipbookTexDiv', () => {
  it('texDiv {5,4} é flipbook', () => {
    expect(isFlipbookTexDiv([5, 4])).toBe(true)
  })

  it('texDiv {1,1} ou null não é flipbook', () => {
    expect(isFlipbookTexDiv([1, 1])).toBe(false)
    expect(isFlipbookTexDiv(null)).toBe(false)
  })
})

describe('classifyLoLGroundQuadScale', () => {
  it('cracks2: decal', () => {
    expect(classifyLoLGroundQuadScale([55, 600, 600])).toBe('decal')
  })

  it('fire_ring_red: flipbookSquare por texDiv {5,4}', () => {
    expect(classifyLoLGroundQuadScale([300, 1, 1], [5, 4])).toBe('flipbookSquare')
  })

  it('padrão Brand {50,1,1}: flipbookSquare por escala', () => {
    expect(classifyLoLGroundQuadScale([50, 1, 1])).toBe('flipbookSquare')
  })

  it('qualquer escala com texDiv > 1×1: flipbookSquare', () => {
    expect(classifyLoLGroundQuadScale([60, 50, 50], [2, 2])).toBe('flipbookSquare')
    expect(classifyLoLGroundQuadScale([10, 300, 1], [5, 4])).toBe('flipbookSquare')
  })

  it('strip alternativo {10,300,1} sem spritesheet multi-célula', () => {
    expect(classifyLoLGroundQuadScale([10, 300, 1])).toBe('strip')
    expect(classifyLoLGroundQuadScale([10, 300, 1], [1, 1])).toBe('strip')
  })

  it('END_Ground_Core: decal', () => {
    expect(classifyLoLGroundQuadScale([200, 200, 1])).toBe('decal')
  })

  it('escalas equilibradas: neutral', () => {
    expect(classifyLoLGroundQuadScale([60, 50, 50])).toBe('neutral')
  })

  it('hoop zero-axis: decal', () => {
    expect(classifyLoLGroundQuadScale([0, 280, 280])).toBe('decal')
  })
})

describe('remapLoLQuadScaleForPlane', () => {
  it('cracks2: {55,600,600} → plano 600×600 com espessura 1', () => {
    expect(remapLoLQuadScaleForPlane([55, 600, 600])).toEqual([600, 600, 1])
  })

  it('fire_ring_red: {300,1,1} + texDiv → malha 300×300', () => {
    expect(remapLoLQuadScaleForPlane([300, 1, 1], 0.01, [5, 4])).toEqual([300, 300, 1])
  })

  it('texDiv > 1×1 força quadrado no maior eixo', () => {
    expect(remapLoLQuadScaleForPlane([10, 300, 1], 0.01, [5, 4])).toEqual([300, 300, 1])
  })

  it('strip {10,300,1} preservado sem texDiv multi-célula', () => {
    expect(remapLoLQuadScaleForPlane([10, 300, 1])).toEqual([10, 300, 1])
  })

  it('END_Ground_Core: {200,200,1} permanece proporcional', () => {
    expect(remapLoLQuadScaleForPlane([200, 200, 1])).toEqual([200, 200, 1])
  })

  it('escalas equilibradas não remapeiam', () => {
    expect(remapLoLQuadScaleForPlane([60, 50, 50])).toEqual([60, 50, 50])
  })

  it('hoop zero-axis: {0,280,280} → disco', () => {
    expect(remapLoLQuadScaleForPlane([0, 280, 280])).toEqual([280, 280, 1])
  })
})

describe('computeEmitterFrameState — ground decals', () => {
  it('cracks2 (Brand): escala ~600×600 no preview', () => {
    const emitter = makeGroundEmitter({ name: 'cracks2' })
    const frame = computeEmitterFrameState(emitter, 0.01, 0, 1)
    expect(frame.groundScaleKind).toBe('decal')
    expect(frame.scale[0]).toBeCloseTo(6, 0)
    expect(frame.scale[1]).toBeCloseTo(6, 0)
    expect(frame.scale[2]).toBe(1)
    expect(frame.scale[1] / frame.scale[0]).toBeCloseTo(1, 1)
  })

  it('fire_ring_red: flipbookSquare ~300×300 no preview', () => {
    const emitter = makeGroundEmitter({
      name: 'fire_ring_red',
      birthScale0: { constant: [300, 1, 1], dynamics: null },
      birthRotation0: { constant: [-90, 0, 0], dynamics: null },
      numFrames: 20,
      texDiv: [5, 4],
    })
    const frame = computeEmitterFrameState(emitter, 0.01, 0, 1)
    expect(frame.groundScaleKind).toBe('flipbookSquare')
    expect(frame.scale[0]).toBeCloseTo(3, 0)
    expect(frame.scale[1]).toBeCloseTo(3, 0)
    expect(frame.scale[2]).toBe(1)
    expect(frame.scale[1] / frame.scale[0]).toBeCloseTo(1, 1)
  })

  it('cracks2: birthRotation {-90,-90,0} não inclina fora do plano', () => {
    const emitter = makeGroundEmitter({ name: 'cracks2' })
    const frame = computeEmitterFrameState(emitter, 0.01, 0, 1)
    expect(frame.rotation[0]).toBe(0)
    expect(frame.rotation[2]).toBe(0)
  })

  it('END_Ground_Core (Lux): escala 200×200 preservada', () => {
    const core = loadLuxQMis().emitters.find((emitter) => emitter.name === 'END_Ground_Core')!
    const frame = computeEmitterFrameState(core, 0.01, 0, 1)
    expect(frame.scale[0]).toBeCloseTo(2, 0)
    expect(frame.scale[1]).toBeCloseTo(2, 0)
    expect(frame.scale[2]).toBe(1)
  })

  it('Splat (billboard): birthScale 25×100×0 não usa remap ground', () => {
    const parsed = parseRitualVfx(readFileSync(previewPath, 'utf8'))
    const splat = parsed.emitters.find((emitter) => emitter.name === 'Splat')!
    const frame = computeEmitterFrameState(splat, 0.01, 0, 7)
    expect(frame.scale[2]).toBe(1)
    expect(frame.scale[0]).toBeGreaterThan(0.05)
    expect(frame.scale[1]).toBeGreaterThan(0.05)
  })

  it('hoop1: birthScale com eixo 0 mapeia disco (regressão)', () => {
    const hoop1 = loadLuxQMis().emitters.find((emitter) => emitter.name === 'hoop1')!
    const hoopZeroAxis = {
      ...hoop1,
      birthScale0: { constant: [0, 280, 280] as [number, number, number], dynamics: null },
    }
    const frame = computeEmitterFrameState(hoopZeroAxis, 0.01, 0.5, 42)
    expect(frame.scale[0]).toBeGreaterThan(0.2)
    expect(frame.scale[1]).toBeGreaterThan(0.2)
    expect(frame.scale[2]).toBe(1)
    expect(frame.scale[1] / frame.scale[0]).toBeCloseTo(1, 1)
  })
})

describe('birthRotationGroundInPlaneEuler', () => {
  it('{-90,-90,0} produz rotação nula no plano', () => {
    expect(birthRotationGroundInPlaneEuler([-90, -90, 0], [0, 0, 0], 0)).toEqual([0, 0, 0])
  })

  it('giro em Z LoL vira spin em Z Three', () => {
    const rot = birthRotationGroundInPlaneEuler([0, 0, 45], [0, 0, 0], 0)
    expect(rot[0]).toBe(0)
    expect(rot[1]).toBe(0)
    expect(rot[2]).toBeCloseTo(Math.PI / 4, 5)
  })
})
