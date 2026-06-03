import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseVfxEmitterFromBlock } from '../ritualParseVfx'
import { extractEmitterFeatures } from './vfxEmitterFeatures'
import { getComposablePipeline } from './vfxRenderStrategy'
import {
  applyMotionAdjustments,
  executeMotionStrategies,
  VFX_GROUND_PLANE_Z,
} from './executors/motionStrategyExecutor'
import { computeEmitterFrameState } from '../vfxWebAnimation'

const brandPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../_brand.txt')

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

describe('Fase 3 — Brand parse', () => {
  it('cracks2: useNavmeshMask parseado e trait NavmeshGroundClip', () => {
    const source = readFileSync(brandPath, 'utf8')
    const block = findEmitterBlock(source, 'cracks2')
    const emitter = parseVfxEmitterFromBlock(block)
    expect(emitter.name).toBe('cracks2')
    expect(emitter.useNavmeshMask).toBe(true)
    expect(emitter.isGroundLayer).toBe(true)

    const features = extractEmitterFeatures(emitter)
    expect(features.navmeshMask).toBe(true)

    const pipeline = getComposablePipeline(emitter)
    expect(pipeline.traits).toContain('NavmeshGroundClip')
    expect(pipeline.motion).toContain('groundNavmeshSnap')
  })

  it('cracks2 preview: Y no plano chão após motion executor', () => {
    const source = readFileSync(brandPath, 'utf8')
    const block = findEmitterBlock(source, 'cracks2')
    const emitter = parseVfxEmitterFromBlock(block)
    const pipeline = getComposablePipeline(emitter)
    const rawFrame = computeEmitterFrameState(emitter, 0.01, 0, 1, {
      composablePipeline: pipeline,
    })
    const adjusted = applyMotionAdjustments(
      rawFrame,
      executeMotionStrategies(pipeline, rawFrame),
    )
    expect(adjusted.position[2]).toBe(VFX_GROUND_PLANE_Z)
  })
})
