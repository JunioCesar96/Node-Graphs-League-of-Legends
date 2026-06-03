import { describe, expect, it } from 'vitest'

import { lolFnv1aHash, lolFnv1aHashHex, normalizeRitualHashKey } from './lolFnv1aHash'

describe('lolFnv1aHash', () => {
  it('corresponde a hashes conhecidos do export PROP', () => {
    expect(lolFnv1aHash('particleName')).toBe(0xecf1c6bc)
    expect(lolFnv1aHash('emitterName')).toBe(0x3d25b8ce)
    expect(lolFnv1aHash('VfxSystemDefinitionData')).toBe(0x45cd899f)
    expect(lolFnv1aHashHex('texture')).toBe('0x3c6468f4')
  })

  it('normaliza zeros à esquerda em chaves hex', () => {
    expect(normalizeRitualHashKey('0x007b14f6')).toBe('0x7b14f6')
    expect(normalizeRitualHashKey('0xECF1C6BC')).toBe('0xecf1c6bc')
  })
})
