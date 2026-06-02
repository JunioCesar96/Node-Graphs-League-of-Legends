import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseRitualVfx } from './ritualParseVfx'
import { integrateAxisMotionWithDrag } from './vfxParticleMotion'
import { computeEmitterFrameState } from './vfxWebAnimation'

const previewPath = join(dirname(fileURLToPath(import.meta.url)), '../../../_preview.md')

describe('integrateAxisMotionWithDrag', () => {
  it('sem arrasto aproxima v·t + ½at²', () => {
    const parabolic = 10 * 0.5 + 0.5 * (-9) * 0.25
    const dragged = integrateAxisMotionWithDrag(10, -9, 0, 0.5)
    expect(dragged).toBeCloseTo(parabolic, 1)
  })

  it('arrasto reduz deslocamento', () => {
    const free = integrateAxisMotionWithDrag(100, 0, 0, 1)
    const damped = integrateAxisMotionWithDrag(100, 0, 5, 1)
    expect(damped).toBeLessThan(free)
    expect(damped).toBeGreaterThan(0)
  })
})

describe('computeEmitterFrameState com birthDrag', () => {
  it('Juice sobe menos com birthDrag do que parabólico puro', () => {
    const parsed = parseRitualVfx(readFileSync(previewPath, 'utf8'))
    const juice = parsed.emitters.find((emitter) => emitter.name === 'Juice')!
    expect(juice.birthDrag?.constant).toEqual([2, 10, 2])

    const withDrag = computeEmitterFrameState(juice, 0.01, 0.4, 42)
    const juiceNoDrag = { ...juice, birthDrag: null }
    const withoutDrag = computeEmitterFrameState(juiceNoDrag, 0.01, 0.4, 42)

    const heightWith = Math.hypot(withDrag.position[0], withDrag.position[1], withDrag.position[2])
    const heightWithout = Math.hypot(
      withoutDrag.position[0],
      withoutDrag.position[1],
      withoutDrag.position[2],
    )
    expect(heightWith).toBeLessThan(heightWithout)
  })
})
