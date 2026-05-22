import { describe, expect, it } from 'vitest'

import {
  ritualExportFieldName,
  ritualExportFieldNameFromParameter,
} from '@/core/ritualFieldNames'

describe('ritualFieldNames', () => {
  it('capitaliza primeiro carácter (PascalCase ritual)', () => {
    expect(ritualExportFieldName('particleName')).toBe('ParticleName')
    expect(ritualExportFieldName('disableBackfaceCull')).toBe('DisableBackfaceCull')
  })

  it('preserva prefixo m de membro', () => {
    expect(ritualExportFieldName('mResourceResolver')).toBe('mResourceResolver')
  })

  it('extrai nome do parameter.id', () => {
    expect(
      ritualExportFieldNameFromParameter({
        id: 'VfxEmitterDefinitionData_parameter_disableBackfaceCull',
        name: 'disableBackfaceCull',
      }),
    ).toBe('DisableBackfaceCull')
  })
})
