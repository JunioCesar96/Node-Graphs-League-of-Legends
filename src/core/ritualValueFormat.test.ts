import { describe, expect, it } from 'vitest'

import type { NodeParameterDefinition } from '@/core/nodeSchema'
import { formatRitualScalarAssignment } from './ritualValueFormat'

function optionParam(type: NodeParameterDefinition['type'], name: string): NodeParameterDefinition {
  return {
    id: `VfxEmitterDefinitionData_parameter_${name}`,
    name,
    type,
    defaultValue: '',
  }
}

describe('formatRitualScalarAssignment option blocks', () => {
  it('optionF32 emite bloco ritual com chaves', () => {
    const line = formatRitualScalarAssignment(optionParam('optionF32', 'lifetime'), '1', '            ')
    expect(line).toBe(
      [
        'Lifetime: option[f32] = {',
        '                1',
        '            }',
      ].join('\n'),
    )
  })

  it('optionF32 com decimal emite bloco', () => {
    const line = formatRitualScalarAssignment(
      optionParam('optionF32', 'particleLinger'),
      '10.6',
      '            ',
    )
    expect(line).toContain('ParticleLinger: option[f32] = {')
    expect(line).toContain('10.6')
    expect(line).not.toMatch(/=\s*10\.6\s*$/)
  })

  it('optionString emite string quotada dentro do bloco', () => {
    const line = formatRitualScalarAssignment(
      optionParam('optionString', 'iconCircle'),
      'ASSETS/icon.tex',
      '    ',
    )
    expect(line).toContain('IconCircle: option[string] = {')
    expect(line).toContain('"ASSETS/icon.tex"')
  })

  it('vec3 com chaves ritual exporta componentes correctos', () => {
    const param = {
      id: 'ValueVector3_parameter_constantValue',
      name: 'constantValue',
      type: 'vector3' as const,
    }
    const line = formatRitualScalarAssignment(param, '{ 20, 80, 45 }', '    ')
    expect(line).toContain('vec3 = { 20, 80, 45 }')
    expect(line).not.toContain('0, 20, 80')
  })

  it('optionVector3 emite vec3 dentro do bloco', () => {
    const line = formatRitualScalarAssignment(
      optionParam('optionVector3', 'overrideBoundingBox'),
      '115, 260, 115',
      '    ',
    )
    expect(line).toContain('OverrideBoundingBox: option[vec3] = {')
    expect(line).toContain('{ 115, 260, 115 }')
  })
})
