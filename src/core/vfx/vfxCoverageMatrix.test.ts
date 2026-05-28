import { describe, expect, it } from 'vitest'

import {
  buildVfxCoverageMatrix,
  formatVfxCoverageReport,
  summarizeVfxCoverage,
} from './vfxCoverageMatrix'

describe('vfxCoverageMatrix', () => {
  it('lista campos do schema VfxEmitterDefinitionData', () => {
    const matrix = buildVfxCoverageMatrix()
    expect(matrix.length).toBeGreaterThan(40)
    expect(matrix.some((row) => row.field === 'bindWeight')).toBe(true)
    expect(matrix.some((row) => row.field === 'alphaErosionDefinition')).toBe(true)
  })

  it('campos do plano de auditoria estão marcados como parse full', () => {
    const matrix = buildVfxCoverageMatrix()
    const byField = Object.fromEntries(matrix.map((row) => [row.field, row]))
    expect(byField.bindWeight?.parse).toBe('full')
    expect(byField.birthAcceleration?.parse).toBe('full')
    expect(byField.startFrame?.parse).toBe('full')
    expect(byField.colorLookUpScales?.shader).toBe('full')
    expect(byField.alphaErosionDefinition?.shader).toBe('full')
  })

  it('sumário e relatório tabular são geráveis', () => {
    const matrix = buildVfxCoverageMatrix()
    const summary = summarizeVfxCoverage(matrix)
    expect(summary.parseFull).toBeGreaterThan(20)
    const report = formatVfxCoverageReport(matrix)
    expect(report).toContain('bindWeight')
    expect(report).toContain('parse\tanimation')
    expect(report).toContain('\tsemantic')
    expect(summary.semanticFull).toBeGreaterThan(5)
  })
})
