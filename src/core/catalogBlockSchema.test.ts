import { describe, expect, it } from 'vitest'

import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import {
  buildCatalogBlockSchemaFromDefinition,
  resolveSchemaForCatalogBlockDefinition,
} from './catalogBlockSchema'
import { resolveSchemaIdForBlockDefinition } from './blockDefinitionJson'
import type { NodeSchemaDefinition } from './nodeSchema'

const sampleDefinition: BlockDefinitionJsonDocument = {
  id: 'teste_teste',
  block: 'main2',
  blockName: 'teste',
  type: 'standalone',
  name: 'teste',
  source: { kind: 'block', nodeId: 'teste' },
  color: '#ff0000',
  headerSlots: ['in[main2]', 'out[testePreview]'],
  parameters: [],
}

describe('buildCatalogBlockSchemaFromDefinition', () => {
  it('gera schema mínimo com title = blockName', () => {
    const schema = buildCatalogBlockSchemaFromDefinition(sampleDefinition)
    expect(schema).toMatchObject({
      id: 'teste',
      title: 'teste',
      parameters: [],
      internalStructures: [],
      nomenclature: {
        collectionType: 'teste',
      },
    })
  })
})

describe('resolveSchemaForCatalogBlockDefinition', () => {
  it('usa schema existente quando encontrado por título', () => {
    const existing: NodeSchemaDefinition = {
      id: 'existing-teste',
      title: 'teste',
      parameters: [{ id: 'p1', name: 'foo', type: 'string', defaultValue: '' }],
      internalStructures: [],
    }
    const lookup = { [existing.id]: existing }
    const resolved = resolveSchemaForCatalogBlockDefinition(
      sampleDefinition,
      lookup,
      resolveSchemaIdForBlockDefinition,
    )
    expect(resolved).toBe(existing)
  })

  it('sintetiza schema quando não existe no registo', () => {
    const resolved = resolveSchemaForCatalogBlockDefinition(
      sampleDefinition,
      {},
      resolveSchemaIdForBlockDefinition,
    )
    expect(resolved.title).toBe('teste')
    expect(resolved.id).toBe('teste')
  })
})
