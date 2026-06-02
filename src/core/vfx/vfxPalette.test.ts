import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { collectTexturePathsFromRitual } from './collectRitualAssetPaths'
import { parseRitualVfx } from './ritualParseVfx'
import {
  resolvePaletteSelectorIndex,
  resolvePaletteSrcMixMask,
  resolvePaletteUniforms,
} from './vfxPalette'
import { buildMaterialParams } from './vfxWebMaterials'

const luxFixturePath = join(dirname(fileURLToPath(import.meta.url)), '../../../_lux_q_hoop.fixture.md')

describe('VfxPaletteDefinition parse', () => {
  const parsed = parseRitualVfx(readFileSync(luxFixturePath, 'utf8'))
  const core3 = parsed.emitters.find((emitter) => emitter.name === 'Core3')!
  const sparks = parsed.emitters.find((emitter) => emitter.name === 'Sparks_')!

  it('parseia paletteTexture, selector e count (Core3 e Sparks_)', () => {
    for (const emitter of [core3, sparks]) {
      const palette = emitter.paletteDefinition!
      expect(palette.paletteTexture.toLowerCase()).toContain('flame_trail_gradient')
      expect(palette.paletteCount).toBe(10)
      expect(palette.paletteSrcMixColor).toEqual([1, 0, 0, 0])
    }
    expect(core3.paletteDefinition?.paletteSelector?.constant).toEqual([6, 0, 0])
    expect(sparks.paletteDefinition?.paletteSelector?.constant).toEqual([9, 0, 0])
  })

  it('resolvePaletteUniforms usa selector.x e máscara R', () => {
    const coreUniforms = resolvePaletteUniforms(core3.paletteDefinition)
    expect(coreUniforms.paletteSelector).toBe(6)
    expect(coreUniforms.paletteCount).toBe(10)
    expect(coreUniforms.paletteMixMask).toEqual([1, 0, 0, 0])
    expect(resolvePaletteSelectorIndex(sparks.paletteDefinition!)).toBe(9)
    expect(resolvePaletteSrcMixMask(sparks.paletteDefinition!)).toEqual([1, 0, 0, 0])
  })

  it('buildMaterialParams activa palette quando há URL', () => {
    const material = buildMaterialParams(
      core3,
      { opacity: 1, color: [1, 1, 1, 1], spriteOffset: [0, 0], uvScroll: [0, 0] },
      'blob:main',
      false,
      null,
      false,
      null,
      false,
      null,
      false,
      'blob:palette',
      false,
    )
    expect(material.paletteTextureUrl).toBe('blob:palette')
    expect(material.paletteSelector).toBe(6)
    expect(material.paletteMixMask).toEqual([1, 0, 0, 0])
    expect(material.paletteCount).toBe(10)
  })

  it('collectTexturePathsFromRitual inclui gradiente', () => {
    const paths = collectTexturePathsFromRitual(readFileSync(luxFixturePath, 'utf8'))
    expect(paths.some((path) => path.toLowerCase().includes('flame_trail_gradient'))).toBe(true)
  })
})
