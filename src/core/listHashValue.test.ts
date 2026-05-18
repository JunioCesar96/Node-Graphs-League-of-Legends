import { describe, expect, it } from 'vitest'

import { normalizeHashItem, normalizeListHashRitualBody, parseListHashString } from '@/core/listHashValue'

describe('listHashValue', () => {
  it('parse nomes entre aspas e hex por linha', () => {
    expect(normalizeListHashRitualBody('"Spell4"\n0x792ee8b0')).toBe('Spell4\n0x792ee8b0')
    expect(parseListHashString('Spell4\n0x792ee8b0')).toEqual(['Spell4', '0x792ee8b0'])
  })

  it('normaliza hex para 8 dígitos', () => {
    expect(normalizeHashItem('0x792ee8b0')).toBe('0x792ee8b0')
    expect(normalizeHashItem('2033117360')).toBe('0x792ee8b0')
  })
})
