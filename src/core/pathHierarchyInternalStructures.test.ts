import { describe, expect, it } from 'vitest'

import type { InternalStructureDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'
import { filterInternalStructuresByPathHierarchy } from '@/core/pathHierarchyInternalStructures'

function stubSchema(collection: string): NodeSchemaDefinition {
  return {
    id: 'stub',
    title: 'Stub',
    parameters: [],
    internalStructures: [],
    nomenclature: {
      group: '#3 Internal Structures',
      collection,
      collectionType: 'T',
    },
  }
}

describe('filterInternalStructuresByPathHierarchy', () => {
  const catalog: InternalStructureDefinition[] = [
    { id: 'c1', name: 'Embed child', schemaId: 'em' },
    { id: 'c2', name: 'Collection child', schemaId: 'col' },
  ]

  const registry: Record<string, NodeSchemaDefinition> = {
    em: { ...stubSchema('#3 Embed Block'), id: 'em' },
    col: { ...stubSchema('#3 Collection Block'), id: 'col' },
  }

  it('sem steps, devolve o catálogo inalterado', () => {
    expect(filterInternalStructuresByPathHierarchy(undefined, catalog, registry)).toEqual(catalog)
    expect(filterInternalStructuresByPathHierarchy([], catalog, registry)).toEqual(catalog)
  })

  it('com contexto SkinCharacter só permite #3 Embed Block', () => {
    const steps = [{ id: 'x', type: '#2 Root Entry (SkinCharacterDataProperties)' }]
    const out = filterInternalStructuresByPathHierarchy(steps, catalog, registry)
    expect(out.map((x) => x.schemaId)).toEqual(['em'])
  })

  it('com contexto #2 VFX Definition Root permite embed e collection', () => {
    const steps = [{ id: 's', type: '#2 VFX Definition Root' }]
    const out = filterInternalStructuresByPathHierarchy(steps, catalog, registry)
    expect(out.map((x) => x.schemaId).sort()).toEqual(['col', 'em'])
  })
})
