import { describe, expect, it } from 'vitest'

import {
  formatMapU64PointerString,
  isMapU64PointerRitType,
  normalizeU64Key,
  parseMapU64PointerString,
  resolveMapU64PointerParameterType,
} from '@/core/mapU64PointerValue'

describe('mapU64PointerValue', () => {
  it('resolveMapU64PointerParameterType reconhece map[u64,pointer]', () => {
    expect(resolveMapU64PointerParameterType('map[u64,pointer]')).toBe('mapU64Pointer')
    expect(resolveMapU64PointerParameterType('map[hash,pointer]')).toBeNull()
  })

  it('isMapU64PointerRitType', () => {
    expect(isMapU64PointerRitType('map[u64,pointer]')).toBe(true)
    expect(isMapU64PointerRitType('map[hash,pointer]')).toBe(false)
  })

  it('parse e format chaves decimais u64', () => {
    const entries = [
      { key: '574043308619688281', schemaId: 'time-blend-data', typeName: 'TimeBlendData' },
    ]
    const serialized = formatMapU64PointerString(entries)
    expect(parseMapU64PointerString(serialized)).toEqual(entries)
  })

  it('normalizeU64Key mantém só dígitos', () => {
    expect(normalizeU64Key('574043308619688281')).toBe('574043308619688281')
    expect(normalizeU64Key(' 12abc34 ')).toBe('1234')
    expect(normalizeU64Key('')).toBe('0')
  })
})
