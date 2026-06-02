/**
 * Auditoria offline: distribuição de classes semânticas por fixture.
 * npm run vfx:audit-semantics
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseRitualVfxCatalog } from '../ritualParseVfx'
import { resolveEmitterSemanticAnalysis } from './emitterSemanticClassifier'

const luxFixturePath = join(dirname(fileURLToPath(import.meta.url)), '../../../../_lux_q_hoop.fixture.md')

describe('auditoria semântica — Lux Q mis', () => {
  it('imprime distribuição geometry|material|motion|groundScale', () => {
    const catalog = parseRitualVfxCatalog(readFileSync(luxFixturePath, 'utf8'))
    const counts = new Map<string, number>()

    for (const entry of catalog.entries) {
      for (const emitter of entry.system.emitters) {
        const analysis = resolveEmitterSemanticAnalysis(emitter)
        const traits = analysis.active.join('+') || '-'
        const key = `${traits}|${analysis.profile.geometry.kind}|${analysis.materialIntent}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }

    const lines = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => `${n}\t${key}`)
    // eslint-disable-next-line no-console
    console.log('\n[VFX semantic audit]\n' + lines.join('\n'))

    expect(counts.size).toBeGreaterThan(0)
    expect([...counts.keys()].some((k) => k.includes('BeamExtruded'))).toBe(true)
    expect([...counts.keys()].some((k) => k.includes('TrailRibbon'))).toBe(true)
  })
})
