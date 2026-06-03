import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { collectTexturePathsFromRitual } from './collectRitualAssetPaths'
import { parseRitualVfx, parseRitualVfxCatalog } from './ritualParseVfx'
import { computeEmitterActiveWindow } from './vfxEmitterTimeline'
import {
  MAX_PREVIEW_PARTICLES_PER_EMITTER,
  computeParticleInstances,
  countPreviewParticlesForEmitter,
} from './vfxParticleInstances'
import { computeEmitterFrameState } from './vfxWebAnimation'
import { buildMaterialParams } from './vfxWebMaterials'
import { buildVfxWebCatalogFromRitual } from './vfxWebBuilder'

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), '../../../_lux_q_hoop.fixture.md')

const LUX_Q_MIS_EMITTERS = [
  'Core3',
  'END_Beam_ROTATING',
  'END_Ground_Core',
  'Left',
  'Left1',
  'Sparks_',
  'Temp_GroundGlow',
  'Temp_GroundGlow2',
  'Temp_GroundGlow3',
  'Trail5',
  'Trail_dark',
  'Trail_small',
  'Trail_small1',
  'hoop1',
  'hoop2',
  'rays',
] as const

function loadLuxQMis() {
  const text = readFileSync(fixturePath, 'utf8')
  const catalog = parseRitualVfxCatalog(text)
  const system = catalog.entries[0]!.system
  return { text, catalog, system }
}

describe('Lux_Base_Q_mis fixture (_lux_q_hoop.fixture.md)', () => {
  const { text, catalog, system } = loadLuxQMis()

  it('catalogo com um sistema e metadados do mis', () => {
    expect(catalog.entries).toHaveLength(1)
    expect(system.particleName).toBe('Lux_Base_Q_mis')
    expect(system.particlePath).toContain('Lux_Base_Q_mis')
    expect(system.emitters).toHaveLength(LUX_Q_MIS_EMITTERS.length)
    expect(system.emitters.map((emitter) => emitter.name).sort()).toEqual([...LUX_Q_MIS_EMITTERS].sort())
  })

  it('cena web cobre todos os emitters e duração > 3s', () => {
    const built = buildVfxWebCatalogFromRitual(text)
    const scene = built.entries[0]!.scene
    expect(scene.emitters).toHaveLength(LUX_Q_MIS_EMITTERS.length)
    expect(scene.lifetime).toBeGreaterThan(3)
    expect(scene.warnings.length).toBe(0)
  })

  it('coleta texturas do ritual (bokeh, spectral, mote)', () => {
    const paths = collectTexturePathsFromRitual(text)
    const joined = paths.join(' ').toLowerCase()
    expect(joined).toContain('lux_base_z_bokeh')
    expect(joined).toContain('color-spectralbell')
    expect(joined).toContain('lux_base_r_mote')
  })
})

describe('Lux Q mis — hoop1 (anéis rainbow)', () => {
  const hoop1 = loadLuxQMis().system.emitters.find((emitter) => emitter.name === 'hoop1')!

  it('parseia rate, drag, texDiv, VfxShapeLegacy e escala inicial', () => {
    expect(hoop1.isSingleParticle).toBe(false)
    expect(hoop1.rate).toBe(30)
    expect(hoop1.texDiv).toEqual([2, 2])
    expect(hoop1.birthDrag?.constant).toEqual([0, 3, 0])
    expect(hoop1.birthScale0?.constant).toEqual([60, 50, 50])
    expect(hoop1.isUniformScale).toBe(true)
    expect(hoop1.miscRenderFlags).toBe(1)
    expect(hoop1.texture.toLowerCase()).toContain('bokeh')
    expect(hoop1.spawnShape?.kind).toBe('legacy')
    if (hoop1.spawnShape?.kind === 'legacy') {
      expect(hoop1.spawnShape.emitOffset?.constant).toEqual([30, 0, 0])
      expect(hoop1.spawnShape.emitRotationAxis[1]).toBeCloseTo(1, 3)
    }
  })

  it('gera enxame de partículas (rate 30) na preview', () => {
    const instances = computeParticleInstances(hoop1, 2)
    expect(instances.length).toBeGreaterThan(5)
    expect(instances.length).toBeLessThanOrEqual(MAX_PREVIEW_PARTICLES_PER_EMITTER)
    expect(countPreviewParticlesForEmitter(hoop1)).toBe(MAX_PREVIEW_PARTICLES_PER_EMITTER)
  })

  it('janela activa cobre lifetime 10s + vida da partícula', () => {
    const window = computeEmitterActiveWindow(hoop1)
    expect(window.start).toBe(0)
    expect(window.end).toBeGreaterThan(10)
  })

  it('birthScale com eixo 0 mapeia para disco (padrão LoL)', () => {
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

  it('miscRenderFlags bit 1 com blend normal inverte faces', () => {
    const material = buildMaterialParams(
      hoop1,
      { opacity: 1, color: [1, 1, 1, 1], spriteOffset: [0, 0], uvScroll: [0, 0] },
      null,
      false,
      null,
      false,
      null,
      false,
    )
    expect(material.isAdditive).toBe(false)
    expect(material.flipNormals).toBe(true)
  })
})

describe('Lux Q mis — hoop2 orbital', () => {
  const hoop2 = loadLuxQMis().system.emitters.find((emitter) => emitter.name === 'hoop2')!

  it('birthOrbitalVelocity em Y com legacy radius 40', () => {
    expect(hoop2.birthOrbitalVelocity?.constant).toEqual([0, 2, 0])
    expect(hoop2.spawnShape?.kind).toBe('legacy')
    if (hoop2.spawnShape?.kind === 'legacy') {
      expect(hoop2.spawnShape.emitOffset?.constant).toEqual([40, 0, 0])
    }
  })
})

describe('Lux Q mis — palette', () => {
  const system = loadLuxQMis().system

  it('Core3 e Sparks_ usam Flame_trail_gradient', () => {
    const core3 = system.emitters.find((emitter) => emitter.name === 'Core3')!
    const sparks = system.emitters.find((emitter) => emitter.name === 'Sparks_')!
    expect(core3.paletteDefinition?.paletteCount).toBe(10)
    expect(core3.paletteDefinition?.paletteSelector?.constant).toEqual([6, 0, 0])
    expect(sparks.paletteDefinition?.paletteSelector?.constant).toEqual([9, 0, 0])
  })
})

describe('Lux Q mis — emitters especiais', () => {
  const system = loadLuxQMis().system

  it('END_Beam_ROTATING: single, additive, pass 500', () => {
    const beam = system.emitters.find((emitter) => emitter.name === 'END_Beam_ROTATING')!
    expect(beam.isSingleParticle).toBe(true)
    expect(beam.blendMode).toBe(4)
    expect(beam.pass).toBe(500)
    expect(beam.importance).toBe(3)
    expect(beam.alphaRef).toBe(0)
  })

  it('END_Beam desenha à frente de hoop1 (pass + importance)', () => {
    const beam = system.emitters.find((emitter) => emitter.name === 'END_Beam_ROTATING')!
    const hoop1 = system.emitters.find((emitter) => emitter.name === 'hoop1')!
    const beamMat = buildMaterialParams(
      beam,
      { opacity: 1, color: [1, 1, 1, 1], spriteOffset: [0, 0], uvScroll: [0, 0] },
      null,
      false,
      null,
      false,
      null,
      false,
    )
    const hoopMat = buildMaterialParams(
      hoop1,
      { opacity: 1, color: [1, 1, 1, 1], spriteOffset: [0, 0], uvScroll: [0, 0] },
      null,
      false,
      null,
      false,
      null,
      false,
    )
    expect(beamMat.renderOrder).toBeGreaterThan(hoopMat.renderOrder)
  })

  it('rays: primitivo ray', () => {
    const rays = system.emitters.find((emitter) => emitter.name === 'rays')!
    expect(rays.primitiveKind).toBe('ray')
    expect(rays.isSingleParticle).toBe(false)
  })

  it('END_Ground_Core: arbitrary quad + additive', () => {
    const core = system.emitters.find((emitter) => emitter.name === 'END_Ground_Core')!
    expect(core.primitiveKind).toBe('arbitrary_quad')
    expect(core.blendMode).toBe(4)
    expect(core.isSingleParticle).toBe(true)
  })

  it('Trail5: trail arbitrário', () => {
    const trail = system.emitters.find((emitter) => emitter.name === 'Trail5')!
    expect(trail.primitiveKind).toBe('trail')
    expect(trail.texture.toLowerCase()).toContain('trail')
  })
})
