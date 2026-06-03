import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseVfxEmitterFromBlock } from './ritualParseVfx'
import { computeEmitterFrameState } from './vfxWebAnimation'
import { computeParticleSpawnOffsetLol } from './vfxSpawnShape'
import { sampleErosionDrive } from './vfxAlphaErosion'
import { resolveBindWeight } from './vfxBindWeight'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

function loadEstruturaBin(): string {
  return readFileSync(join(ROOT, 'estrutura_bin.py'), 'utf8')
}

function extractEmitterBlock(source: string, emitterName: string): string {
  const marker = `EmitterName: string = "${emitterName}"`
  const start = source.indexOf(marker)
  if (start < 0) throw new Error(`Emitter ${emitterName} não encontrado em estrutura_bin.py`)

  const blockStart = source.lastIndexOf('VfxEmitterDefinitionData {', start)
  if (blockStart < 0) throw new Error(`Bloco VfxEmitterDefinitionData para ${emitterName} não encontrado`)

  let depth = 0
  for (let index = blockStart; index < source.length; index++) {
    const char = source[index]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(blockStart, index + 1)
      }
    }
  }
  throw new Error(`Fim do bloco para ${emitterName} não encontrado`)
}

describe('estrutura_bin.py — golden emitters', () => {
  const source = loadEstruturaBin()

  it('Temp_Mesh beam: bindWeight + primitive beam + mesh', () => {
    const block = extractEmitterBlock(source, 'Temp_Mesh')
    const emitter = parseVfxEmitterFromBlock(block)
    expect(emitter.primitiveKind).toBe('beam')
    expect(emitter.bindWeight?.constant).toBe(1)
    expect(emitter.meshPath?.toLowerCase()).toContain('zac_q_arm.skn')
  })

  it('emitter com VfxShapeCylinder: spawn cilíndrico', () => {
    const cylinderIdx = source.indexOf('SpawnShape: pointer = VfxShapeCylinder')
    expect(cylinderIdx).toBeGreaterThan(0)
    const blockStart = source.lastIndexOf('VfxEmitterDefinitionData {', cylinderIdx)
    let depth = 0
    let blockEnd = blockStart
    for (let i = blockStart; i < source.length; i++) {
      if (source[i] === '{') depth += 1
      else if (source[i] === '}') {
        depth -= 1
        if (depth === 0) {
          blockEnd = i + 1
          break
        }
      }
    }
    const emitter = parseVfxEmitterFromBlock(source.slice(blockStart, blockEnd))
    expect(emitter.spawnShape?.kind).toBe('cylinder')
    if (emitter.spawnShape?.kind === 'cylinder') {
      expect(emitter.spawnShape.radius).toBeCloseTo(250, 0)
      expect(emitter.spawnShape.height).toBeCloseTo(60, 0)
    }
    const offset = computeParticleSpawnOffsetLol(emitter, 42, 0)
    expect(Math.hypot(offset[0], offset[2])).toBeLessThanOrEqual(250.5)
  })

  it('AlphaErosionDefinition: parse drive curve e mapa', () => {
    const erosionIdx = source.indexOf('AlphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData')
    expect(erosionIdx).toBeGreaterThan(0)
    const blockStart = source.lastIndexOf('VfxEmitterDefinitionData {', erosionIdx)
    let depth = 0
    let blockEnd = blockStart
    for (let i = blockStart; i < source.length; i++) {
      if (source[i] === '{') depth += 1
      else if (source[i] === '}') {
        depth -= 1
        if (depth === 0) {
          blockEnd = i + 1
          break
        }
      }
    }
    const emitter = parseVfxEmitterFromBlock(source.slice(blockStart, blockEnd))
    expect(emitter.alphaErosion?.erosionMapName.toLowerCase()).toContain('.tex')
    expect(emitter.alphaErosion?.erosionDriveCurve?.dynamics?.times).toEqual([0, 0.25])
    const driveStart = sampleErosionDrive(emitter.alphaErosion, 0)
    const driveMid = sampleErosionDrive(emitter.alphaErosion, 0.5)
    expect(driveStart).toBeCloseTo(1, 2)
    expect(driveMid).toBeLessThan(driveStart)
  })

  it('bindWeight reduz deslocamento por velocidade', () => {
    const block = extractEmitterBlock(source, 'Temp_Mesh')
    const emitter = parseVfxEmitterFromBlock(block)
    expect(resolveBindWeight(emitter.bindWeight)).toBe(1)
    emitter.birthVelocity = { kind: 'ValueVector3', constant: [800, 0, 0], dynamics: null }
    emitter.particleLifetime = 2
    const free = computeEmitterFrameState({ ...emitter, bindWeight: null }, 0.01, 0.5, 1, {
      particleTime: 0.5,
    })
    const bound = computeEmitterFrameState(emitter, 0.01, 0.5, 1, { particleTime: 0.5 })
    const freeMag = Math.hypot(free.position[0], free.position[1], free.position[2])
    const boundMag = Math.hypot(bound.position[0], bound.position[1], bound.position[2])
    expect(freeMag).toBeGreaterThan(0.05)
    expect(boundMag).toBeLessThan(freeMag)
  })
})
