import { afterEach, describe, expect, it } from 'vitest'

import {
  partitionAddonPaletteTagKeys,
  readHiddenAddonPaletteTagKeys,
  STORAGE_ADDON_PALETTE_TAG_FILTER_HIDDEN_KEY,
  writeHiddenAddonPaletteTagKeys,
} from '@/core/addonPaletteTagFilterPreferences'

describe('addonPaletteTagFilterPreferences', () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_ADDON_PALETTE_TAG_FILTER_HIDDEN_KEY)
  })

  it('grava e lê tags ocultas normalizadas', () => {
    writeHiddenAddonPaletteTagKeys([' bool ', 'bool', 'Values'])
    expect(readHiddenAddonPaletteTagKeys()).toEqual(['bool', 'Values'])
  })

  it('particiona tags visíveis e ocultas do catálogo', () => {
    const all = ['[{20}]', 'bool', 'Values']
    const { visibleTagKeys, hiddenTagKeysInCatalog } = partitionAddonPaletteTagKeys(all, ['bool'])

    expect(visibleTagKeys).toEqual(['[{20}]', 'Values'])
    expect(hiddenTagKeysInCatalog).toEqual(['bool'])
  })
})
