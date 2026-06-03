import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseVfxEmitterFromBlock } from '../ritualParseVfx'
import { extractEmitterFeatures } from './vfxEmitterFeatures'
import { getComposablePipeline } from './vfxRenderStrategy'
import { executeMaterialStrategies } from './executors/materialStrategyExecutor'
import {
  applyMotionAdjustments,
  executeMotionStrategies,
} from './executors/motionStrategyExecutor'
import { groundPlaneHitResolver } from '../vfxGroundHit'
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

describe('Fase 4 — Brand world fields', () => {
  it('ground emitter com depthBiasFactors parseado', () => {
    const source = readFileSync(brandPath, 'utf8')
    const block = findEmitterBlock(source, 'cracks2')
    const emitter = parseVfxEmitterFromBlock(block)
    const idx = block.indexOf('depthBiasFactors')
    if (idx >= 0) {
      expect(emitter.depthBiasFactors).not.toBeNull()
    }
    const withBias = { ...emitter, depthBiasFactors: [-1, -200] as [number, number] }
    const features = extractEmitterFeatures(withBias)
    expect(features.hasDepthBias).toBe(true)
    const pipeline = getComposablePipeline(withBias)
    expect(pipeline.traits).toContain('DepthBiasedDecal')
    const descriptor = executeMaterialStrategies({
      emitter: withBias,
      frame: {
        opacity: 1,
        color: [1, 1, 1, 1],
        spriteOffset: [0, 0],
        uvScroll: [0, 0],
        erosionDrive: 1,
        distortionDrive: 1,
      },
      pipeline,
      features,
      textureUrl: null,
      textureIsDds: false,
      colorTextureUrl: null,
      colorTextureIsDds: false,
      textureMultUrl: null,
      textureMultIsDds: false,
    })
    expect(descriptor.polygonOffsetFactor).toBe(-1)
    expect(descriptor.polygonOffsetUnits).toBe(-200)
    expect(descriptor.shaderFeatures.depthBias).toBe(true)
  })

  it('navmesh snap usa Y do chão injectado', () => {
    const source = readFileSync(brandPath, 'utf8')
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'cracks2'))
    const pipeline = getComposablePipeline(emitter)
    const rawFrame = computeEmitterFrameState(emitter, 0.01, 0, 1, { composablePipeline: pipeline })
    const groundZ = 0.35
    const adjusted = applyMotionAdjustments(
      rawFrame,
      executeMotionStrategies(pipeline, rawFrame, {
        groundHitResolver: groundPlaneHitResolver(groundZ),
      }),
    )
    expect(adjusted.position[2]).toBe(groundZ)
    expect(adjusted.position[2]).not.toBe(0.02)
  })
})
