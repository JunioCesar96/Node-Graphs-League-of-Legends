import { describe, expect, it } from 'vitest'

import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import { adaptBlockParameterDocumentForDefinition } from './blockParameterCatalogClone'
import type { BlockParameterJsonDocumentSimple } from './blockParameterJson'

const targetDefinition: BlockDefinitionJsonDocument = {
  id: 'MyBlock_MyBlock',
  block: 'MyBlock',
  blockName: 'MyBlock',
  type: 'standalone',
  name: 'MyBlock',
  source: { kind: 'block', nodeId: 'my-block' },
  color: '#40ff56',
  headerSlots: ['in[MyBlock]', 'out[MyBlockPreview]'],
  parameters: [],
}

const sourceParam: BlockParameterJsonDocumentSimple = {
  id: 'type_type',
  block: 'Main',
  parameterName: 'type',
  name: 'type',
  source: { kind: 'parameter', parameterId: 'main_parameter_type' },
  type: 'string',
  value: 'PROP',
  slots: { in: ['string'], out: ['string'] },
}

describe('adaptBlockParameterDocumentForDefinition', () => {
  it('rebinda block, id e source para o bloco destino', () => {
    const adapted = adaptBlockParameterDocumentForDefinition(sourceParam, targetDefinition)
    expect(adapted).toMatchObject({
      id: 'type_type',
      block: 'MyBlock',
      parameterName: 'type',
      source: { kind: 'parameter', parameterId: 'my-block_parameter_type' },
      type: 'string',
      value: 'PROP',
    })
  })
})
