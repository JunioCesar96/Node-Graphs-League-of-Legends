import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseRitualVfx } from './ritualParseVfx'
import {
  MAX_PREVIEW_PARTICLES_PER_EMITTER,
  computeParticleInstances,
  countPreviewParticlesForEmitter,
} from './vfxParticleInstances'

const treichoPath = join(dirname(fileURLToPath(import.meta.url)), '../../../_treicho.md')

describe('computeParticleInstances', () => {
  it('isSingleParticle devolve no máximo uma instância', () => {
    const parsed = parseRitualVfx(readFileSync(treichoPath, 'utf8'))
    const ring = parsed.emitters.find((emitter) => emitter.name === 'ring')!
    expect(ring.isSingleParticle).toBe(true)

    const atMid = computeParticleInstances(ring, 0.5)
    expect(atMid.length).toBeLessThanOrEqual(1)
    expect(atMid[0]?.particleTime).toBeCloseTo(0.5, 3)
  })

  it('rate alto gera várias partículas vivas no mesmo instante', () => {
    const parsed = parseRitualVfx(readFileSync(treichoPath, 'utf8'))
    const rays = parsed.emitters.find((emitter) => emitter.name === 'rays')!
    expect(rays.isSingleParticle).toBe(false)
    expect(rays.rate).toBeGreaterThan(10)

    const instances = computeParticleInstances(rays, 0.15)
    expect(instances.length).toBeGreaterThan(1)
    expect(instances.length).toBeLessThanOrEqual(MAX_PREVIEW_PARTICLES_PER_EMITTER)
  })

  it('fora da janela de vida não há instâncias', () => {
    const parsed = parseRitualVfx(readFileSync(treichoPath, 'utf8'))
    const rays = parsed.emitters.find((emitter) => emitter.name === 'rays')!
    const late = computeParticleInstances(rays, rays.lifetime + rays.particleLifetime + rays.particleLinger + 5)
    expect(late).toHaveLength(0)
  })

  it('countPreviewParticlesForEmitter estima enxame por rate×lifetime', () => {
    const parsed = parseRitualVfx(readFileSync(treichoPath, 'utf8'))
    const rays = parsed.emitters.find((emitter) => emitter.name === 'rays')!
    expect(countPreviewParticlesForEmitter(rays)).toBeGreaterThan(5)
  })
})
