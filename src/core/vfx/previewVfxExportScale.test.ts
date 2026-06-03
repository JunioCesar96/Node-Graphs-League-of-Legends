import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseVfxEmitterFromBlock } from './ritualParseVfx'
import { deriveGroundScaleKind } from './semantic/vfxEmitterFeatures'
import { computeEmitterFrameState } from './vfxWebAnimation'
import { getComposablePipeline } from './semantic/vfxRenderStrategy'
import { resolveTransformPipeline } from './semantic/transformPipelineResolver'

const brandPath = join(dirname(fileURLToPath(import.meta.url)), '../../../_brand.txt')

function findEmitterBlock(source: string, emitterName: string): string {
  const marker = `emitterName: string = "${emitterName}"`
  const idx = source.indexOf(marker)
  if (idx < 0) throw new Error(`emitter ${emitterName} not found`)
  const start = source.lastIndexOf('VfxEmitterDefinitionData {', idx)
  if (start < 0) throw new Error(`block start for ${emitterName} not found`)
  let depth = 0
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  throw new Error(`block end for ${emitterName} not found`)
}

describe('previewVfxExportScale — prestige_up_star2', () => {
  const source = readFileSync(brandPath, 'utf8')

  it('birthScale0 ritual permanece 20,80,45 após parse', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'prestige_up_star2'))
    expect(emitter.birthScale0?.constant).toEqual([20, 80, 45])
  })

  it('escala preview Three.js com vfxScale 0.01 fica em ordem de grandeza razoável', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'prestige_up_star2'))
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)
    const frame = computeEmitterFrameState(emitter, 0.01, 0, 42, {
      particleTime: 0,
      composablePipeline: composable,
      transformPipeline,
    })

    expect(frame.scale[0]).toBeLessThan(10)
    expect(frame.scale[1]).toBeLessThan(10)
    expect(frame.scale[2]).toBeLessThan(10)
    expect(frame.scale.every((component) => component > 0)).toBe(true)
  })
})

describe('previewVfxExportScale — Pillar_bk2 (birthScale0 vec3 X,Y,Z)', () => {
  const source = readFileSync(brandPath, 'utf8')

  function pillarEmitter() {
    return parseVfxEmitterFromBlock(findEmitterBlock(source, 'Pillar_bk2'))
  }

  function pillarFrame(particleTime: number, seed = 42) {
    const emitter = pillarEmitter()
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)
    return computeEmitterFrameState(emitter, 0.01, particleTime, seed, {
      particleTime,
      composablePipeline: composable,
      transformPipeline,
    })
  }

  it('birthScale0 ritual permanece 100,10,10 após parse (ordem X,Y,Z)', () => {
    const emitter = pillarEmitter()
    expect(emitter.birthScale0?.constant).toEqual([100, 10, 10])
    expect(emitter.primitiveKind).toBe('arbitrary_quad')
    expect(emitter.isGroundLayer).toBe(false)
  })

  it('multiplica birthScale0 e scale0 por eixo (sem remap ground)', () => {
    expect(deriveGroundScaleKind([100, 10, 10])).toBe('neutral')
    const frame = pillarFrame(0.05)
    const birth = [100, 10, 10] as const
    const scale0 = [2, 3, 1] as const
    const vfxScale = 0.01
    expect(frame.scale[0] / frame.scale[1]).toBeCloseTo(
      (birth[0] * scale0[0]) / (birth[1] * scale0[1]),
      5,
    )
    expect(frame.scale[0] / frame.scale[2]).toBeCloseTo(
      (birth[0] * scale0[0]) / (birth[2] * scale0[2]),
      5,
    )
    expect(frame.scale[1] / frame.scale[2]).toBeCloseTo(
      (birth[1] * scale0[1]) / (birth[2] * scale0[2]),
      5,
    )
    expect(frame.scale[0]).toBeCloseTo(birth[0] * scale0[0] * vfxScale, 5)
    expect(frame.scale[1]).toBeCloseTo(birth[1] * scale0[1] * vfxScale, 5)
    expect(frame.scale[2]).toBeCloseTo(birth[2] * scale0[2] * vfxScale, 5)
  })
})
