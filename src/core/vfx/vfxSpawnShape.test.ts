import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseRitualVfx } from './ritualParseVfx'
import { computeEmitterFrameState } from './vfxWebAnimation'
import {
  applyOrbitalRotationLol,
  computeLegacySpawnOffsetLol,
  computeParticleSpawnOffsetLol,
  rotateVec3AroundAxis,
} from './vfxSpawnShape'

const luxFixturePath = join(dirname(fileURLToPath(import.meta.url)), '../../../_lux_q_hoop.fixture.md')

describe('rotateVec3AroundAxis', () => {
  it('rota offset em X para o plano XZ com eixo Y a 90°', () => {
    const rotated = rotateVec3AroundAxis([30, 0, 0], [0, 1, 0], 90)
    expect(rotated[0]).toBeCloseTo(0, 3)
    expect(rotated[2]).toBeCloseTo(-30, 3)
  })
})

describe('VfxShapeLegacy Lux Q hoop', () => {
  const hoop1 = parseRitualVfx(readFileSync(luxFixturePath, 'utf8')).emitters.find(
    (emitter) => emitter.name === 'hoop1',
  )!

  it('parseia legacy com offset 30 e eixo Y', () => {
    expect(hoop1.spawnShape?.kind).toBe('legacy')
    if (hoop1.spawnShape?.kind !== 'legacy') return
    expect(hoop1.spawnShape.emitOffset?.constant).toEqual([30, 0, 0])
    expect(hoop1.spawnShape.emitRotationAxis[1]).toBeCloseTo(1, 3)
    expect(hoop1.spawnShape.emitRotationAngle).not.toBeNull()
  })

  it('seeds diferentes produzem offsets distintos no anel', () => {
    if (hoop1.spawnShape?.kind !== 'legacy') return
    const a = computeLegacySpawnOffsetLol(hoop1.spawnShape, 1)
    const b = computeLegacySpawnOffsetLol(hoop1.spawnShape, 99)
    expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThan(5)
    expect(Math.hypot(a[0], a[2])).toBeCloseTo(30, 1)
    expect(Math.hypot(b[0], b[2])).toBeCloseTo(30, 1)
  })

  it('partículas do hoop1 aparecem em posições diferentes na preview', () => {
    const frameA = computeEmitterFrameState(hoop1, 0.01, 2, 10, { particleTime: 0.1 })
    const frameB = computeEmitterFrameState(hoop1, 0.01, 2, 77, { particleTime: 0.1 })
    const dist = Math.hypot(
      frameA.position[0] - frameB.position[0],
      frameA.position[1] - frameB.position[1],
      frameA.position[2] - frameB.position[2],
    )
    expect(dist).toBeGreaterThan(0.05)
  })

  it('computeParticleSpawnOffsetLol mantém raio do emitOffset', () => {
    const offset = computeParticleSpawnOffsetLol(hoop1, 42)
    expect(Math.hypot(offset[0], offset[1], offset[2])).toBeCloseTo(30, 1)
  })
})

describe.skip('birthOrbitalVelocity hoop2', () => {
  const hoop2 = parseRitualVfx(readFileSync(luxFixturePath, 'utf8')).emitters.find(
    (emitter) => emitter.name === 'hoop2',
  )!

  it('parseia vetor orbital bruto do ritual', () => {
    expect(hoop2.birthOrbitalVelocity?.constant).toEqual([0, 2, 0])
  })

  it('offset orbital gira com o tempo (mesmo seed)', () => {
    const atZero = computeParticleSpawnOffsetLol(hoop2, 5, 0)
    const atOne = computeParticleSpawnOffsetLol(hoop2, 5, 1)
    expect(Math.hypot(atZero[0] - atOne[0], atZero[2] - atOne[2])).toBeGreaterThan(0.5)
    expect(Math.hypot(atOne[0], atOne[1], atOne[2])).toBeCloseTo(40, 1)
  })

  it('applyOrbitalRotationLol preserva raio', () => {
    const base: [number, number, number] = [40, 0, 0]
    const rotated = applyOrbitalRotationLol(base, [0, 90, 0], 1)
    expect(Math.hypot(rotated[0], rotated[2])).toBeCloseTo(40, 1)
    expect(rotated[0]).toBeCloseTo(0, 1)
  })

  it('ω Y(editor)=2°/frame: 1s (30 fr) ≈ 60° no plano YZ (eixo X)', () => {
    const base: [number, number, number] = [40, 0, 0]
    const oneFrame = applyOrbitalRotationLol(base, [0, 2, 0], 1)
    expect(oneFrame[0]).toBeCloseTo(base[0], 1)

    const oneSec = applyOrbitalRotationLol(base, [0, 2, 0], 30)
    expect(oneSec[0]).toBeCloseTo(20, 1)

    const oneSecMapped = computeParticleSpawnOffsetLol(hoop2, 5, 1)
    expect(Math.hypot(oneSecMapped[0], oneSecMapped[1], oneSecMapped[2])).toBeCloseTo(40, 1)
    expect(Number.isFinite(oneSecMapped[0])).toBe(true)
  })

  it('partícula do hoop2 muda de posição entre t=0 e t=0.5', () => {
    const frame0 = computeEmitterFrameState(hoop2, 0.01, 1, 8, { particleTime: 0 })
    const frameMid = computeEmitterFrameState(hoop2, 0.01, 1, 8, { particleTime: 0.5 })
    const dist = Math.hypot(
      frame0.position[0] - frameMid.position[0],
      frame0.position[2] - frameMid.position[2],
    )
    expect(dist).toBeGreaterThan(0.02)
  })

  it('ω Y(editor) = 5°/frame: offset distinto em t=0.5 vs t=1 (raio preservado)', () => {
    const fastHoop = {
      ...hoop2,
      birthOrbitalVelocity: { constant: [0, 5, 0] as [number, number, number], dynamics: null },
    }
    const atHalf = computeParticleSpawnOffsetLol(fastHoop, 5, 0.5)
    const atOne = computeParticleSpawnOffsetLol(fastHoop, 5, 1)
    expect(Math.hypot(atHalf[1] - atOne[1], atHalf[2] - atOne[2])).toBeGreaterThan(0.5)
    expect(Math.hypot(atHalf[0], atHalf[1], atHalf[2])).toBeCloseTo(40, 1)
    expect(Math.hypot(atOne[0], atOne[1], atOne[2])).toBeCloseTo(40, 1)
  })
})
