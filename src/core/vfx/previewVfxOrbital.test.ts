import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseVfxEmitterFromBlock } from './ritualParseVfx'
import { extractEmitterFeatures } from './semantic/vfxEmitterFeatures'
import { resolveEmitterTraits } from './semantic/vfxTraitScoring'

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

describe.skip('previewVfxOrbital — Temp_BurstUp1 (Brand)', () => {
  const source = readFileSync(brandPath, 'utf8')

  it('birthOrbitalVelocity ritual {0, 0.5, 0} com dynamics', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'Temp_BurstUp1'))
    expect(emitter.birthOrbitalVelocity?.constant).toEqual([0, 0.5, 0])
    expect(emitter.birthOrbitalVelocity?.dynamics).not.toBeNull()
  })

  it('activa trait OrbitalMotion pela constante ω', () => {
    const emitter = parseVfxEmitterFromBlock(findEmitterBlock(source, 'Temp_BurstUp1'))
    const features = extractEmitterFeatures(emitter)
    const resolved = resolveEmitterTraits(features)
    expect(features.orbitalVelocity).toBe(true)
    expect(resolved.active).toContain('OrbitalMotion')
  })
})
