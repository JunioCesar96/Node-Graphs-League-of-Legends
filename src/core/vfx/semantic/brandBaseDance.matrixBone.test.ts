import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseVfxEmitterFromBlock } from '../ritualParseVfx'
import { resolveBindWeight } from '../vfxBindWeight'
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

describe('Brand_Base_Dance — matrix + bone (Fase 6)', () => {
  const source = readFileSync(brandPath, 'utf8')

  it('FireCards2: bindWeight parseado; pipeline EmitterAttached + useLeagueMatrixP', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'FireCards2'))
    expect(resolveBindWeight(emitter.bindWeight)).toBeGreaterThan(0)

    const pipeline = resolveTransformPipeline(emitter, getComposablePipeline(emitter))
    expect(pipeline.simulationSpace).toBe('EmitterAttached')
    expect(pipeline.useLeagueMatrixP).toBe(true)
  })

  it('FireCards2 com osso mock: posição segue bone + spawn local', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'FireCards2'))
    const composable = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composable)

    const boneWorld: [number, number, number] = [1, 2, 3]
    const state = computeParticleTransform({
      emitter,
      vfxScale: 0.01,
      particleTime: 0.1,
      particleNormalized: 0.1,
      seed: 42,
      lockMotion: false,
      composablePipeline: composable,
      transformPipeline,
      referenceBoneName: 'C_Buffbone_Glb',
      resolveBoneWorld: () => boneWorld,
    })

    expect(state.worldMatrix?.length).toBe(16)
    expect(state.position[0]).toBeCloseTo(boneWorld[0], 1)
    expect(state.position[1]).toBeGreaterThan(boneWorld[1])
  })

  it('dark2: mesh .scb parseado', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'dark2'))
    expect(emitter.meshPath?.toLowerCase()).toContain('.scb')
    const pipeline = resolveTransformPipeline(emitter, getComposablePipeline(emitter))
    expect(pipeline.orientationMode).toBe('MeshAttached')
  })
})
