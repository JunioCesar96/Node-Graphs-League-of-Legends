import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseRitualVfxCatalog, parseVfxEmitterFromBlock } from '../ritualParseVfx'
import { getEmitterActiveTraits } from './emitterSemanticClassifier'
import { getComposablePipeline } from './vfxRenderStrategy'
import { resolveTransformPipeline } from './transformPipelineResolver'
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

describe('Brand_Base_Dance — transform semantic (Fase 5)', () => {
  const source = readFileSync(brandPath, 'utf8')

  it('sistema Brand_Base_Dance existe no ritual', () => {
    const catalog = parseRitualVfxCatalog(source)
    const dance = catalog.entries.find((e) => e.system.particlePath.includes('Brand_Base_Dance'))
    expect(dance).toBeDefined()
    expect(dance!.system.emitters.some((em) => em.name === 'cracks2')).toBe(true)
    expect(dance!.system.emitters.some((em) => em.name === 'FireCards2')).toBe(true)
  })

  it('cracks2: pipeline ground + escala decal', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'cracks2'))
    expect(emitter.isGroundLayer).toBe(true)
    const composable = getComposablePipeline(emitter)
    const transform = resolveTransformPipeline(emitter, composable)
    expect(transform.orientationMode).toBe('GroundAligned')
    expect(transform.scaleSpace).toBe('GroundPlane')
    expect(transform.transformOrder).toBe('GroundBasisFirst')

    const frame = computeEmitterFrameState(emitter, 0.01, 0, 1, {
      composablePipeline: composable,
      transformPipeline: transform,
    })
    expect(frame.scale[0]).toBeCloseTo(6, 0)
    expect(frame.scale[1]).toBeCloseTo(6, 0)
    expect(frame.transformPipeline?.orientationMode).toBe('GroundAligned')
  })

  it('FireCards2: rotation0 + isRotationEnabled parseados; trait ContinuousSpin', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'FireCards2'))
    expect(emitter.isRotationEnabled).toBe(true)
    expect(emitter.rotation0).not.toBeNull()
    expect(emitter.rotation0?.dynamics?.times?.length).toBeGreaterThan(1)

    const traits = getEmitterActiveTraits(emitter)
    expect(traits).toContain('ContinuousSpin')

    const transform = resolveTransformPipeline(emitter, getComposablePipeline(emitter))
    expect(transform.orientationMode).not.toBe('GroundAligned')
  })
})
