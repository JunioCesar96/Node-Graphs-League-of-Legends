import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseRitualVfx } from './ritualParseVfx'
import { buildMaterialParams } from './vfxWebMaterials'
import {
  miscRenderFlagsInvertFaces,
  resolveAlphaCutoff,
  resolveDepthWrite,
  resolveRenderOrder,
  shouldAlphaTest,
  shouldFlipNormals,
} from './vfxRenderFlags'

const previewPath = join(dirname(fileURLToPath(import.meta.url)), '../../../_preview.md')

describe('vfxRenderFlags', () => {
  it('alphaRef define cutoff e depth write em blend alpha', () => {
    expect(resolveAlphaCutoff(0)).toBe(0)
    expect(resolveAlphaCutoff(255)).toBeCloseTo(1)
    expect(shouldAlphaTest(30, false)).toBe(true)
    expect(shouldAlphaTest(30, true)).toBe(false)
    expect(resolveDepthWrite(false, 30)).toBe(true)
    expect(resolveDepthWrite(true, 30)).toBe(false)
    expect(resolveRenderOrder(5, 2)).toBe(5002)
    expect(resolveRenderOrder(0, 0, 3)).toBe(30)
    expect(resolveRenderOrder(500, 0, 3)).toBeGreaterThan(resolveRenderOrder(0, 0, 3))
  })

  it('miscRenderFlags bit 1 activa inversão em blend alpha', () => {
    expect(miscRenderFlagsInvertFaces(1)).toBe(true)
    expect(shouldFlipNormals(1, 1, false)).toBe(true)
    expect(shouldFlipNormals(1, 4, false)).toBe(false)
  })

  it('Splat com miscRenderFlags aplica flipNormals no material', () => {
    const parsed = parseRitualVfx(readFileSync(previewPath, 'utf8'))
    const splat = parsed.emitters.find((emitter) => emitter.name === 'Splat')!
    expect(splat.miscRenderFlags).toBe(1)

    const material = buildMaterialParams(splat, { opacity: 1, color: [1, 1, 1, 1], spriteOffset: [0, 0], uvScroll: [0, 0] }, null, false, null, false, null, false)
    expect(material.flipNormals).toBe(true)
  })
})
