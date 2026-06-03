import { describe, expect, it } from 'vitest'

import { parseVfxEmitterFromBlock } from './ritualParseVfx'
import { computeEmitterFrameState } from './vfxWebAnimation'
import { computeParticleSpawnOffsetLol } from './vfxSpawnShape'

const LUX_HOOP_SNIPPET = `
VfxEmitterDefinitionData {
    emitterName: string = "hoop1"
    colorLookUpScales: vec2 = { 1, 0.5 }
    colorLookUpTypeX: u8 = 1
    colorLookUpTypeY: u8 = 2
    startFrame: u16 = 2
    texDiv: vec2 = { 2, 2 }
    particleLifetime: embed = ValueFloat { constantValue: f32 = 1 }
    birthScale0: embed = ValueVector3 { constantValue: vec3 = { 60, 50, 50 } }
    texture: string = "ASSETS/test.tex"
}
`

const LUX_BOX_SNIPPET = `
VfxEmitterDefinitionData {
    emitterName: string = "Left"
    SpawnShape: pointer = VfxShapeBox {
        emitOffset: vec3 = { 0, 10, 0 }
        dimensions: vec3 = { 20, 30, 40 }
    }
    birthAcceleration: embed = ValueVector3 {
        constantValue: vec3 = { 0, 200, 0 }
    }
    particleLifetime: embed = ValueFloat { constantValue: f32 = 1 }
}
`

const BRAND_COLOR_SNIPPET = `
VfxEmitterDefinitionData {
    emitterName: string = "border-proj2"
    particleColorTexture: string = "ASSETS/Characters/Brand/Skins/Base/Particles/common_color-team-shaded-blue.tex"
    colorRenderFlags: u8 = 1
    Color: embed = ValueColor {
        constantValue: vec4 = { 0.84705883, 0.84705883, 0.84705883, 1 }
    }
    particleLifetime: embed = ValueFloat { constantValue: f32 = 10 }
}
`

const TRAIL_SNIPPET = `
VfxEmitterDefinitionData {
    emitterName: string = "Trail5"
    primitive: pointer = VfxPrimitiveArbitraryTrail {
        mTrail: embed = VfxTrailDefinitionData {
            mBirthTilingSize: embed = ValueVector3 {
                constantValue: vec3 = { 500, 0, 0 }
            }
        }
    }
    particleLifetime: embed = ValueFloat { constantValue: f32 = 1 }
}
`

describe('vfx audit features', () => {
  it('parse colorLookUp + startFrame', () => {
    const emitter = parseVfxEmitterFromBlock(LUX_HOOP_SNIPPET)
    expect(emitter.colorLookUpScales).toEqual([1, 0.5])
    expect(emitter.colorLookUpTypeX).toBe(1)
    expect(emitter.colorLookUpTypeY).toBe(2)
    expect(emitter.startFrame).toBe(2)
    const frame = computeEmitterFrameState(emitter, 0.01, 0, 1)
    expect(frame.spriteOffset).toEqual([0, 1])
  })

  it('parse VfxShapeBox spawn', () => {
    const emitter = parseVfxEmitterFromBlock(LUX_BOX_SNIPPET)
    expect(emitter.spawnShape?.kind).toBe('box')
    const offset = computeParticleSpawnOffsetLol(emitter, 99, 0)
    expect(Math.abs(offset[0])).toBeLessThanOrEqual(10)
    expect(Math.abs(offset[1] - 10)).toBeLessThanOrEqual(15)
  })

  it('parse colorRenderFlags + ValueColor (Brand border-proj2)', () => {
    const emitter = parseVfxEmitterFromBlock(BRAND_COLOR_SNIPPET)
    expect(emitter.colorRenderFlags).toBe(1)
    expect(emitter.particleColorTexture).toContain('common_color-team-shaded-blue')
    const frame = computeEmitterFrameState(emitter, 0.01, 0, 1)
    expect(frame.color[0]).toBeCloseTo(0.847, 3)
    expect(frame.color[3]).toBeGreaterThan(0)
  })

  it('parse trail primitive + tiling', () => {
    const emitter = parseVfxEmitterFromBlock(TRAIL_SNIPPET)
    expect(emitter.primitiveKind).toBe('trail')
    expect(emitter.trailBirthTilingSize).toEqual([500, 0, 0])
  })
})
