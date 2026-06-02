import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { collectTexturePathsFromRitual } from './collectRitualAssetPaths'
import { parseRitualVfx, parseRitualVfxCatalog } from './ritualParseVfx'
import {
  computeEmitterActiveWindow,
  isTimeInsideActiveWindow,
} from './vfxEmitterTimeline'

const previewPath = join(dirname(fileURLToPath(import.meta.url)), '../../../_preview.md')

describe('computeEmitterActiveWindow', () => {
  it('Ring single particle termina após lifetime + linger', () => {
    const parsed = parseRitualVfx(readFileSync(previewPath, 'utf8'))
    const ring = parsed.emitters.find((emitter) => emitter.name === 'Ring')!
    const window = computeEmitterActiveWindow(ring)

    expect(window.start).toBe(ring.timeBeforeFirstEmission)
    expect(window.end).toBeCloseTo(ring.timeBeforeFirstEmission + ring.particleLifetime + ring.particleLinger, 3)
    expect(isTimeInsideActiveWindow(ring.particleLifetime * 0.5, window)).toBe(true)
    expect(isTimeInsideActiveWindow(window.end + 1, window)).toBe(false)
  })

  it('emitter com rate estende janela até lifetime + vida da partícula', () => {
    const treichoPath = join(dirname(fileURLToPath(import.meta.url)), '../../../_treicho.md')
    const catalog = parseRitualVfxCatalog(readFileSync(treichoPath, 'utf8'))
    const system = catalog.entries[0]!.system
    const rays = system.emitters.find((emitter) => emitter.name === 'rays')!
    expect(rays.isSingleParticle).toBe(false)

    const window = computeEmitterActiveWindow(rays)
    expect(window.end).toBeGreaterThan(rays.lifetime)
    expect(window.end).toBeCloseTo(rays.timeBeforeFirstEmission + rays.lifetime + rays.particleLifetime + rays.particleLinger, 2)
  })
})

describe('collectTexturePathsFromRitual', () => {
  it('inclui reflectionMapTexture do Ring', () => {
    const paths = collectTexturePathsFromRitual(readFileSync(previewPath, 'utf8'))
    expect(paths.some((path) => path.toLowerCase().includes('cubemap'))).toBe(true)
  })
})
