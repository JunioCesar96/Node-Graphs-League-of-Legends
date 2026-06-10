import { describe, expect, it } from 'vitest'

import { mergeBlockParameterNames } from './blockCatalogCreate'
import type { ManualBlockParameterSelection } from './blockCatalogCreate'

describe('mergeBlockParameterNames', () => {
  it('combina nomes das fontes e do input sem duplicar', () => {
    const sources: ManualBlockParameterSelection[] = [
      {
        source: {
          id: 'beta_beta',
          block: 'Main',
          parameterName: 'beta',
          name: 'beta',
          source: { kind: 'parameter', parameterId: 'main_parameter_beta' },
          type: 'string',
          value: '',
          slots: { in: ['string'], out: ['string'] },
        },
      },
      {
        source: {
          id: 'type_type',
          block: 'Main',
          parameterName: 'type',
          name: 'type',
          source: { kind: 'parameter', parameterId: 'main_parameter_type' },
          type: 'string',
          value: 'PROP',
          slots: { in: ['string'], out: ['string'] },
        },
      },
    ]

    const merged = mergeBlockParameterNames(
      { blockName: 'X', name: 'X', parameters: ['type', 'alpha'] },
      sources,
    )

    expect(merged).toEqual(['beta', 'type', 'alpha'])
  })
})
