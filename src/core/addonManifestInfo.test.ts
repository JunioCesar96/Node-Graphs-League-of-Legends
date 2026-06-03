import { describe, expect, it } from 'vitest'

import { resolveAddonManifestInfo } from '@/core/addonManifestInfo'

describe('addonManifestInfo', () => {
  it('resolve chaves i18n em description e tags', () => {
    const resolved = resolveAddonManifestInfo(
      {
        author: 'Junio Cesar',
        version: '1.0.0',
        description: '[{23}]',
        license: 'MIT',
        tags: ['[{20}]', '[{21}]'],
        link: 'https://example.com',
        docs: 'https://example.com/docs',
      },
      {
        20: 'League of Legends',
        21: 'Galeria',
        23: 'Descrição da galeria',
      },
    )

    expect(resolved?.description).toBe('Descrição da galeria')
    expect(resolved?.tags).toEqual(['League of Legends', 'Galeria'])
    expect(resolved?.author).toBe('Junio Cesar')
  })
})
