import { describe, expect, it } from 'vitest'

import { resolveDroppedAddonDisplayName } from '@/core/addonInstallFromDrop'
import type { AddonManifest } from '@/services/addonLoader.service'

describe('resolveDroppedAddonDisplayName', () => {
  it('resolve nome i18n a partir de language/pt.json', async () => {
    const manifest = {
      id: 'addon-demo',
      name: '[{0}]',
      category: 'Utility',
      drive: 'inputChange',
      get: true,
      set: true,
      data: [],
    } satisfies AddonManifest

    const files = [
      {
        relativePath: 'language/pt.json',
        file: {
          text: async () => JSON.stringify({ '0': 'Demo Addon' }),
        } as File,
      },
    ]

    await expect(resolveDroppedAddonDisplayName(manifest, files, 'pt')).resolves.toBe('Demo Addon')
  })

  it('mantém nome literal quando não é chave i18n', async () => {
    const manifest = {
      id: 'addon-demo',
      name: 'Literal Name',
      category: 'Utility',
      drive: 'inputChange',
      get: true,
      set: true,
      data: [],
    } satisfies AddonManifest

    await expect(resolveDroppedAddonDisplayName(manifest, [], 'pt')).resolves.toBe('Literal Name')
  })
})
