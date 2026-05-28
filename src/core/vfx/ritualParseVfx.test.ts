import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { buildVfxWebCatalogFromRitual } from './vfxWebBuilder'
import {
  parseRitualVfx,
  parseRitualVfxCatalog,
  parseVfxEmitterFromBlock,
  ritualContainsVfxSystem,
} from './ritualParseVfx'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const previewPath = join(fixtureDir, '../../../_preview.md')

function loadPreviewFixture(): string {
  return readFileSync(previewPath, 'utf8')
}

describe('parseRitualVfx golden _preview.md', () => {
  it('detects VfxSystemDefinitionData', () => {
    const text = loadPreviewFixture()
    expect(ritualContainsVfxSystem(text)).toBe(true)
  })

  it('parses Zac particle and three emitters', () => {
    const parsed = parseRitualVfx(loadPreviewFixture())
    expect(parsed.particleName).toBe('Zac_Base_Q_tar')
    expect(parsed.emitters.map((emitter) => emitter.name).sort()).toEqual([
      'Juice',
      'Ring',
      'Splat',
    ])
  })

  it('extracts critical emitter fields', () => {
    const parsed = parseRitualVfx(loadPreviewFixture())
    const ring = parsed.emitters.find((emitter) => emitter.name === 'Ring')
    const splat = parsed.emitters.find((emitter) => emitter.name === 'Splat')
    const juice = parsed.emitters.find((emitter) => emitter.name === 'Juice')

    expect(ring?.blendMode).toBeGreaterThan(0)
    expect(ring?.meshPath?.toLowerCase()).toContain('.scb')
    expect(ring?.birthVelocity?.constant).toEqual([0, -200, 0])
    expect(splat?.texDiv).toEqual([2, 2])
    expect(juice?.birthVelocity?.constant).toEqual([800, 2000, 800])
  })

  it('builds web catalog with lifetime', () => {
    const built = buildVfxWebCatalogFromRitual(loadPreviewFixture())
    expect(built.entries).toHaveLength(1)
    expect(built.entries[0]?.scene.emitters).toHaveLength(3)
    expect(built.entries[0]?.scene.lifetime).toBeGreaterThan(0)
  })
})

describe('parseRitualVfxCatalog PROP com hashes FNV', () => {
  const propHashOnly = `#PROP_text
entries: map[hash,embed] = {
    0x13caaf55 = 0x45cd899f {
        0x868eb76a: list[pointer] = {
            0x09cde442 {
                0x3d25b8ce: string = "Staff"
                0x3c6468f4: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Q_trail.tex"
                0xfa784eab: u8 = 4
            }
        }
        0xecf1c6bc: string = "Lux_Base_W_mis_return"
        0xe7638138: string = "Characters/Lux/Skins/Skin0/Particles/Lux_Base_W_mis_return"
        0xfd01a9d3: f32 = 5000
    }
}
`

  it('detecta VfxSystemDefinitionData por hash de tipo', () => {
    expect(ritualContainsVfxSystem(propHashOnly)).toBe(true)
    const catalog = parseRitualVfxCatalog(propHashOnly)
    expect(catalog.entries).toHaveLength(1)
    expect(catalog.entries[0]?.label).toBe('Lux_Base_W_mis_return')
    expect(catalog.entries[0]?.system.emitters[0]?.name).toBe('Staff')
    expect(catalog.entries[0]?.system.emitters[0]?.texture).toContain('Lux_Base_Q_trail.tex')
    expect(catalog.entries[0]?.system.emitters[0]?.blendMode).toBe(4)
  })
})

describe('parseRitualVfxCatalog multi-entry PROP', () => {
  const multiProp = `#PROP_text
entries: map[hash,embed] = {
    "Characters/Lux/Skins/Skin0/Particles/Lux_Base_Q_cas" = VfxSystemDefinitionData {
        particleName: string = "Lux_Base_Q_cas"
        complexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                emitterName: string = "Q_ray"
            }
        }
    }
    "Characters/Lux/Skins/Skin0/Particles/Lux_Base_R_cas" = VfxSystemDefinitionData {
        particleName: string = "Lux_Base_R_cas"
        complexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                emitterName: string = "R_ring"
            }
        }
    }
}
`

  it('finds all map entries', () => {
    const catalog = parseRitualVfxCatalog(multiProp)
    expect(catalog.entries.map((entry) => entry.label).sort()).toEqual([
      'Lux_Base_Q_cas',
      'Lux_Base_R_cas',
    ])
  })
})

describe('parseRitualVfxCatalog _lux_q_hoop.fixture.md', () => {
  const luxPath = join(fixtureDir, '../../../_lux_q_hoop.fixture.md')

  it('parses primitive inline VfxPrimitiveRay e VfxPrimitiveArbitraryQuad', () => {
    const catalog = parseRitualVfxCatalog(readFileSync(luxPath, 'utf8'))
    const system = catalog.entries[0]!.system
    expect(system.emitters.find((emitter) => emitter.name === 'rays')?.primitiveKind).toBe('ray')
    expect(system.emitters.find((emitter) => emitter.name === 'END_Ground_Core')?.primitiveKind).toBe(
      'arbitrary_quad',
    )
  })
})

describe('parseRitualVfxCatalog _treicho.md', () => {
  const treichoPath = join(fixtureDir, '../../../_treicho.md')

  it('parses alphaRef e pass nos emitters Lux R', () => {
    const text = readFileSync(treichoPath, 'utf8')
    const catalog = parseRitualVfxCatalog(text)
    const entry = catalog.entries.find((item) => item.label === 'Lux_Base_R_cas')
    expect(entry).toBeDefined()
    const system = entry!.system
    const beam = system.emitters.find((emitter) => emitter.name === 'END_Beam_ROTATING')!
    expect(beam.pass).toBe(500)
    expect(beam.alphaRef).toBe(0)
    const rays = system.emitters.find((emitter) => emitter.name === 'rays')!
    expect(rays.pass).toBeGreaterThanOrEqual(0)
  })

  it('parses Lux R cas with nine emitters', () => {
    const text = readFileSync(treichoPath, 'utf8')
    const catalog = parseRitualVfxCatalog(text)
    const entry = catalog.entries.find((item) => item.label === 'Lux_Base_R_cas')
    expect(entry).toBeDefined()
    expect(entry!.label).toBe('Lux_Base_R_cas')
    expect(entry!.system.emitters.map((emitter) => emitter.name).sort()).toEqual([
      'END_Beam_ROTATING',
      'END_Ground_Core',
      'Flame_Shockwave',
      'Runes',
      'Runes1',
      'rays',
      'ring',
      'ring1',
      'ring2',
    ])
  })
})

describe('parseFlexShapeDefinition', () => {
  it('parse ambos os coeficientes', () => {
    const block = `VfxEmitterDefinitionData {
      emitterName: string = "flex_test"
      FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
        scaleBirthScaleByBoundObjectSize: f32 = 0.004
        scaleEmitOffsetByBoundObjectSize: f32 = 0.002
      }
      primitive: pointer = VfxPrimitiveArbitraryQuad {}
    }`
    const emitter = parseVfxEmitterFromBlock(block)
    expect(emitter.flexShape).toEqual({
      scaleBirthScaleByBoundObjectSize: 0.004,
      scaleEmitOffsetByBoundObjectSize: 0.002,
    })
  })
})
