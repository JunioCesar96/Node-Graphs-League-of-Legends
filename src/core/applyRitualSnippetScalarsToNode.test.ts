import { describe, expect, it } from 'vitest'

import {
  applyRitualSnippetScalarsToNode,
  extractScalarFieldsFromRitualSnippet,
  ritualSnippetCanTargetNode,
} from '@/core/applyRitualSnippetScalarsToNode'
import type { NodeInstance } from '@/core/nodeSchema'

const vfxNode: NodeInstance = {
  schema: {
    id: 'vfx-system',
    title: 'VfxSystemDefinitionData',
    parameters: [
      { id: 'vfx_parameter_flags', name: 'flags', type: 'u16', defaultValue: '0' },
      { id: 'vfx_parameter_particleName', name: 'particleName', type: 'string', defaultValue: '' },
    ],
    internalStructures: [],
    nomenclature: { group: '', collection: '', collectionType: 'VfxSystemDefinitionData' },
  },
  values: [
    { parameterId: 'vfx_parameter_flags', value: '198' },
    { parameterId: 'vfx_parameter_particleName', value: '"Zac_Base_Q_tar"' },
  ],
}

describe('applyRitualSnippetScalarsToNode', () => {
  it('extrai campos escalares do trecho', () => {
    const snippet = `
      flags: u16 = 200
      particleName: string = "Zac_Base_Q_tar"
    `
    const fields = extractScalarFieldsFromRitualSnippet(snippet)
    expect(fields).toHaveLength(2)
    expect(fields[0]?.fieldName).toBe('flags')
    expect(fields[0]?.rawValue).toBe('200')
  })

  it('aplica valores ao nó (case-insensitive nos nomes)', () => {
    const snippet = `
      Flags: u16 = 200
      ParticleName: string = "Zac_Base_Q_tar"
    `
    const result = applyRitualSnippetScalarsToNode(vfxNode, snippet)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.updates).toEqual([
      { parameterId: 'vfx_parameter_flags', value: '200' },
      { parameterId: 'vfx_parameter_particleName', value: '"Zac_Base_Q_tar"' },
    ])
  })

  it('rejeita trecho de outro tipo', () => {
    const snippet = `VfxEmitterDefinitionData {
      emitterName: string = "Ring"
    }`
    const check = ritualSnippetCanTargetNode(vfxNode, snippet)
    expect(check.ok).toBe(false)
  })
})
