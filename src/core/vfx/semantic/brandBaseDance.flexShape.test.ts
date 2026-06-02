import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseVfxEmitterFromBlock } from '../ritualParseVfx'
import { computeParticleTransform } from '../vfxTransformEngine'
import { getComposablePipeline } from './vfxRenderStrategy'
import { resolveTransformPipeline } from './transformPipelineResolver'

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

describe('Brand_Base_Dance — FlexShape (Fase 8)', () => {
  const source = readFileSync(brandPath, 'utf8')

  it('ShockwaveSecondary2: parse flexShape', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'ShockwaveSecondary2'))
    expect(emitter.flexShape).toEqual({
      scaleBirthScaleByBoundObjectSize: 0.004,
      scaleEmitOffsetByBoundObjectSize: 0,
    })
  })

  it('escala maior com bound do personagem', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'ShockwaveSecondary2'))
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)

    const withoutBound = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: true,
      composablePipeline: composable,
      transformPipeline,
    })

    const withBound = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 0,
      particleNormalized: 0,
      seed: 1,
      lockMotion: true,
      composablePipeline: composable,
      transformPipeline,
      boundObjectSizeLol: [100, 200, 100],
    })

    expect(withBound.scaleLol[0]).toBeGreaterThan(withoutBound.scaleLol[0])
  })
})
