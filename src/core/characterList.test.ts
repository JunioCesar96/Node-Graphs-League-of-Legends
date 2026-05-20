import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  filterCharacterNames,
  getCharacterNames,
  resetCharacterNamesCache,
} from '@/core/characterList'

describe('characterList', () => {
  afterEach(() => {
    resetCharacterNamesCache()
    vi.unstubAllGlobals()
  })

  it('filterCharacterNames filtra case-insensitive', () => {
    const names = ['Zac', 'Ahri', 'Aatrox']
    expect(filterCharacterNames('za', names)).toEqual(['Zac'])
    expect(filterCharacterNames('', names)).toEqual(names)
  })

  it('getCharacterNames carrega array do JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ characters: ['Zac', 'Ahri'] }),
      }),
    )

    await expect(getCharacterNames()).resolves.toEqual(['Zac', 'Ahri'])
    await expect(getCharacterNames()).resolves.toEqual(['Zac', 'Ahri'])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('getCharacterNames tolera falha de fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    await expect(getCharacterNames()).resolves.toEqual([])
  })
})
