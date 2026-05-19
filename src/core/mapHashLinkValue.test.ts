import { describe, expect, it } from 'vitest'

import {
  formatMapHashLinkString,
  isMapHashLinkValue,
  normalizeMapHashLinkRitualBody,
  parseMapHashLinkRitualBody,
  parseMapHashLinkString,
  resolveMapHashLinkParameterType,
} from '@/core/mapHashLinkValue'

describe('mapHashLinkValue', () => {
  it('resolveMapHashLinkParameterType', () => {
    expect(resolveMapHashLinkParameterType('map[hash,link]')).toBe('mapHashLink')
    expect(resolveMapHashLinkParameterType('map[hash,pointer]')).toBeNull()
  })

  it('isMapHashLinkValue detecta path com slash', () => {
    expect(isMapHashLinkValue('Characters/Zac')).toBe(true)
    expect(isMapHashLinkValue('Zac_E_tar')).toBe(false)
    expect(isMapHashLinkValue('0x1c1ea8de')).toBe(false)
  })

  it('parse e format tab-separated', () => {
    const raw = 'Zac_E_Moving\tCharacters/Zac/Skins\nZac_E_tar\tZac_E_tar'
    const entries = parseMapHashLinkString(raw)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      key: 'Zac_E_Moving',
      value: 'Characters/Zac/Skins',
    })
    expect(entries[1]).toEqual({ key: 'Zac_E_tar', value: 'Zac_E_tar' })
    expect(formatMapHashLinkString(entries)).toBe(raw)
  })

  it('parseMapHashLinkRitualBody com string, path e hex', () => {
    const inner = `
      "Zac_E_Moving" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_Moving"
      "Zac_E_tar" = "Zac_E_tar"
      0x1c1ea8de = 0x1c1ea8de
    `
    const entries = parseMapHashLinkRitualBody(inner)
    expect(entries).toHaveLength(3)
    expect(entries[0]!.value).toContain('/')
    expect(entries[1]!.value).toBe('Zac_E_tar')
    expect(entries[2]!.key).toBe('0x1c1ea8de')
    expect(normalizeMapHashLinkRitualBody(inner)).toContain('Zac_E_Moving\t')
  })
})
