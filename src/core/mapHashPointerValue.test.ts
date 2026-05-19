import { describe, expect, it } from 'vitest'

import {
  catalogStructuresFromEntries,
  emptyMapHashPointerEntry,
  entryWithStructure,
  formatMapHashPointerString,
  hasMapHashPointerStructure,
  normalizeMapHashPointerString,
  parseMapHashPointerString,
  resolveMapHashPointerParameterType,
} from '@/core/mapHashPointerValue'

describe('mapHashPointerValue', () => {
  it('resolveMapHashPointerParameterType', () => {
    expect(resolveMapHashPointerParameterType('map[hash,pointer]')).toBe('mapHashPointer')
    expect(resolveMapHashPointerParameterType('map[hash,link]')).toBeNull()
  })

  it('parse e format tab-separated com schemaId e typeName', () => {
    const raw =
      '0xb638e658\tsubmesh-visibility-event-data\tSubmeshVisibilityEventData\n0x831fa58e\tsubmesh-visibility-event-data\tSubmeshVisibilityEventData'
    const entries = parseMapHashPointerString(raw)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      key: '0xb638e658',
      schemaId: 'submesh-visibility-event-data',
      typeName: 'SubmeshVisibilityEventData',
    })
    expect(formatMapHashPointerString(entries)).toBe(raw)
    expect(normalizeMapHashPointerString(raw)).toBe(raw)
  })

  it('hasMapHashPointerStructure e catálogo único de tipos', () => {
    const hashOnly = emptyMapHashPointerEntry('0xabc')
    expect(hasMapHashPointerStructure(hashOnly)).toBe(false)

    const withStructure = entryWithStructure(
      '0xabc',
      'SubmeshVisibilityEventData',
      'submesh-visibility-event-data',
    )
    expect(hasMapHashPointerStructure(withStructure)).toBe(true)

    const catalog = catalogStructuresFromEntries([
      withStructure,
      entryWithStructure('0xdef', 'SubmeshVisibilityEventData', 'submesh-visibility-event-data'),
      emptyMapHashPointerEntry('0x999'),
    ])
    expect(catalog).toHaveLength(1)
    expect(catalog[0]).toEqual({
      typeName: 'SubmeshVisibilityEventData',
      schemaId: 'submesh-visibility-event-data',
    })
  })

  it('round-trip com entrada só-hash (schemaId vazio)', () => {
    const raw = '0xb638e658\t\t'
    const entries = parseMapHashPointerString(raw)
    expect(entries).toEqual([{ key: '0xb638e658', schemaId: '', typeName: '' }])
    expect(formatMapHashPointerString(entries)).toBe('0xb638e658\t\t')
  })
})
