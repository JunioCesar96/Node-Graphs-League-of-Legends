import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseRitualVfx } from './ritualParseVfx'
import { computeEmitterDuration, computeEmitterFrameState } from './vfxWebAnimation'

const previewPath = join(dirname(fileURLToPath(import.meta.url)), '../../../_preview.md')

describe('computeEmitterFrameState', () => {
  it('Ring desce com gravidade e fica invisível fora da vida da partícula', () => {
    const parsed = parseRitualVfx(readFileSync(previewPath, 'utf8'))
    const ring = parsed.emitters.find((emitter) => emitter.name === 'Ring')
    expect(ring).toBeDefined()

    const atStart = computeEmitterFrameState(ring!, 0.01, 0, 42)
    const mid = computeEmitterFrameState(ring!, 0.01, 0.3, 42)
    const afterLife = computeEmitterFrameState(ring!, 0.01, ring!.particleLifetime + ring!.particleLinger + 1, 42)

    expect(atStart.visible).toBe(true)
    expect(afterLife.visible).toBe(false)
    expect(mid.position[2]).toBeLessThan(atStart.position[2])
    expect(mid.opacity).toBeGreaterThan(0)
  })

  it('cor do Ring desvanece no fim da vida da partícula', () => {
    const parsed = parseRitualVfx(readFileSync(previewPath, 'utf8'))
    const ring = parsed.emitters.find((emitter) => emitter.name === 'Ring')!
    const start = computeEmitterFrameState(ring, 0.01, 0, 1)
    const end = computeEmitterFrameState(ring, 0.01, ring.particleLifetime * 0.95, 1)

    expect(start.color[3]).toBeGreaterThan(end.color[3])
  })

  it('Splat mapeia birthScale 25×100×0 para largura e altura do plano', () => {
    const parsed = parseRitualVfx(readFileSync(previewPath, 'utf8'))
    const splat = parsed.emitters.find((emitter) => emitter.name === 'Splat')!
    const frame = computeEmitterFrameState(splat, 0.01, 0, 7)

    expect(frame.scale[0]).toBeGreaterThan(0.05)
    expect(frame.scale[1]).toBeGreaterThan(0.05)
    expect(frame.scale[2]).toBe(1)
  })

  it('Splat usa folha de sprites 2x2', () => {
    const parsed = parseRitualVfx(readFileSync(previewPath, 'utf8'))
    const splat = parsed.emitters.find((emitter) => emitter.name === 'Splat')!
    const frame = computeEmitterFrameState(splat, 0.01, splat.particleLifetime * 0.5, 7)

    expect(splat.texDiv).toEqual([2, 2])
    expect(frame.spriteOffset[0]).toBeGreaterThanOrEqual(0)
    expect(frame.spriteOffset[0]).toBeLessThan(2)
  })

  it('duração total inclui lifetime e linger', () => {
    const parsed = parseRitualVfx(readFileSync(previewPath, 'utf8'))
    const ring = parsed.emitters.find((emitter) => emitter.name === 'Ring')!
    expect(computeEmitterDuration(ring)).toBeGreaterThan(ring.particleLifetime)
  })
})
