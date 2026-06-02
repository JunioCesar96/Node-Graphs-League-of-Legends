/**
 * Auditoria offline: pipeline de transformação por emitter.
 * npm run vfx:audit-transforms
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseRitualVfxCatalog } from '../ritualParseVfx'
import { getComposablePipeline } from './vfxRenderStrategy'
import { resolveTransformPipeline } from './transformPipelineResolver'

const brandPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../_brand.txt')

describe('auditoria transform — Brand_Base_Dance', () => {
  it('imprime emitter → orientation|scale|order', () => {
    const catalog = parseRitualVfxCatalog(readFileSync(brandPath, 'utf8'))
    const dance = catalog.entries.find((e) => e.system.particlePath.includes('Brand_Base_Dance'))
    expect(dance).toBeDefined()

    const counts = new Map<string, number>()
    for (const emitter of dance!.system.emitters) {
      const composable = getComposablePipeline(emitter)
      const tp = resolveTransformPipeline(emitter, composable)
      const key = `${emitter.name}|${tp.orientationMode}|${tp.scaleSpace}|${tp.transformOrder}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const lines = [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, n]) => `${n}\t${key}`)
    // eslint-disable-next-line no-console
    console.log('\n[VFX transform audit]\n' + lines.join('\n'))

    expect(counts.has('cracks2|GroundAligned|GroundPlane|GroundBasisFirst')).toBe(true)
    expect([...counts.keys()].some((k) => k.startsWith('FireCards2'))).toBe(true)
  })
})
