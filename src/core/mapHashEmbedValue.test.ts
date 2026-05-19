import { describe, expect, it } from 'vitest'

import {
  catalogStructuresFromEntries,
  emptyMapHashEmbedEntry,
  entryWithStructure,
  formatMapHashEmbedString,
  hasMapHashEmbedStructure,
  parseMapHashEmbedString,
  resolveMapHashEmbedParameterType,
} from '@/core/mapHashEmbedValue'

describe('mapHashEmbedValue', () => {
  it('resolveMapHashEmbedParameterType', () => {
    expect(resolveMapHashEmbedParameterType('map[hash,embed]')).toBe('mapHashEmbed')
    expect(resolveMapHashEmbedParameterType('map[hash,pointer]')).toBeNull()
  })

  it('parse e format tab-separated com schemaId e typeName', () => {
    const raw =
      '"Spell3_BackRun"\tatomic-clip-data\tAtomicClipData\n0xb638e658\tsubmesh-visibility-event-data\tSubmeshVisibilityEventData'
    const entries = parseMapHashEmbedString(raw)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      key: 'Spell3_BackRun',
      schemaId: 'atomic-clip-data',
      typeName: 'AtomicClipData',
    })
    expect(formatMapHashEmbedString(entries)).toBe(
      'Spell3_BackRun\tatomic-clip-data\tAtomicClipData\n0xb638e658\tsubmesh-visibility-event-data\tSubmeshVisibilityEventData',
    )
  })

  it('hasMapHashEmbedStructure e catálogo único de tipos', () => {
    const hashOnly = emptyMapHashEmbedEntry('0xabc')
    expect(hasMapHashEmbedStructure(hashOnly)).toBe(false)

    const withStructure = entryWithStructure('0xabc', 'AtomicClipData', 'atomic-clip-data')
    expect(hasMapHashEmbedStructure(withStructure)).toBe(true)

    const catalog = catalogStructuresFromEntries([
      withStructure,
      entryWithStructure('0xdef', 'AtomicClipData', 'atomic-clip-data'),
      emptyMapHashEmbedEntry('0x999'),
    ])
    expect(catalog).toHaveLength(1)
  })
})
