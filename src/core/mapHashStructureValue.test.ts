import { describe, expect, it } from 'vitest'

import {
  catalogStructuresFromEntries,
  hasMapHashStructure,
  parseMapHashStructureString,
  structureCatalogChoiceKey,
} from '@/core/mapHashStructureValue'

describe('mapHashStructureValue', () => {
  it('parse e catálogo partilhado por pointer/embed', () => {
    const raw = '0xabc\tschema-a\tTypeA\n0xdef\tschema-b\tTypeB'
    const entries = parseMapHashStructureString(raw)
    expect(entries).toHaveLength(2)
    expect(hasMapHashStructure(entries[0]!)).toBe(true)
    expect(catalogStructuresFromEntries(entries)).toHaveLength(2)
    expect(structureCatalogChoiceKey({ schemaId: 'schema-a', typeName: 'TypeA' })).toBe('schema-a:TypeA')
  })
})
