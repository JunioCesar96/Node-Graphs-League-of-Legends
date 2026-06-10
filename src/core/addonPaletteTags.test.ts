import { describe, expect, it } from 'vitest'



import {

  addonManifestMatchesPaletteTagFilter,

  addonManifestShouldShowInPaletteList,

  collectAddonPaletteFilterLabels,

  collectAddonPaletteFilterLabelsForManifest,

  migrateLegacyAddonPaletteHiddenTagKeys,

} from '@/core/addonPaletteTags'

import type { AddonManifest } from '@/services/addonLoader.service'



function manifestWithTags(

  id: string,

  tags: string[],

  category = 'Values',

): AddonManifest {

  return {

    id,

    name: id,

    category,

    drive: 'inputChange',

    get: true,

    set: true,

    data: [],

    info: { tags },

  }

}



describe('addonPaletteTags', () => {

  it('collectAddonPaletteFilterLabels inclui categoria e tags resolvidas por add-on', () => {

    const manifests = [

      manifestWithTags('value-bool', ['[{20}]', '[{21}]', 'bool']),

      manifestWithTags('code-block', ['[{20}]', '[{21}]', '[{22}]'], 'Utility'),

    ]

    const packs = {

      'value-bool': { 20: 'Values', 21: 'Parameter' },

      'code-block': { 20: 'League of Legends', 21: 'Utility', 22: 'Blocks' },

    }



    expect(collectAddonPaletteFilterLabels(manifests, packs)).toEqual([

      'Blocks',

      'bool',

      'League of Legends',

      'Parameter',

      'Utility',

      'Values',

    ])

  })



  it('collectAddonPaletteFilterLabelsForManifest combina categoria com tags resolvidas', () => {

    const manifest = manifestWithTags('value-bool', ['[{20}]', 'bool'])

    const labels = collectAddonPaletteFilterLabelsForManifest(manifest, { 20: 'Values' })



    expect(labels).toEqual(['Values', 'Values', 'bool'])

  })



  it('addonManifestMatchesPaletteTagFilter usa etiquetas visíveis com OR', () => {

    const manifests = [

      manifestWithTags('value-bool', ['[{20}]', 'bool']),

      manifestWithTags('code-block', ['[{20}]', '[{21}]'], 'Utility'),

    ]

    const packs = {

      'value-bool': { 20: 'Values', 21: 'Parameter' },

      'code-block': { 20: 'League of Legends', 21: 'Utility' },

    }



    expect(

      addonManifestMatchesPaletteTagFilter(manifests[0], [], packs),

    ).toBe(true)

    expect(

      addonManifestMatchesPaletteTagFilter(manifests[0], ['Parameter'], packs),

    ).toBe(false)

    expect(

      addonManifestMatchesPaletteTagFilter(manifests[0], ['Values'], packs),

    ).toBe(true)

    expect(

      addonManifestMatchesPaletteTagFilter(manifests[1], ['League of Legends'], packs),

    ).toBe(true)

    expect(

      addonManifestMatchesPaletteTagFilter(manifests[1], ['Values'], packs),

    ).toBe(false)

    expect(

      addonManifestMatchesPaletteTagFilter(manifests[0], ['bool', 'Blocks'], packs),

    ).toBe(true)

  })



  it('migrateLegacyAddonPaletteHiddenTagKeys converte chaves i18n antigas', () => {

    const manifests = [manifestWithTags('value-bool', ['[{20}]', '[{21}]', 'bool'])]

    const packs = { 'value-bool': { 20: 'Values', 21: 'Parameter' } }



    expect(

      migrateLegacyAddonPaletteHiddenTagKeys(['[{21}]', 'bool'], manifests, packs),

    ).toEqual(['Parameter', 'bool'])

  })



  it('addonManifestShouldShowInPaletteList oculta add-ons com tag em hidden in list', () => {

    const manifests = [

      manifestWithTags('value-bool', ['[{20}]', 'bool']),

      manifestWithTags('code-json', ['[{22}]'], 'Utility'),

    ]

    const packs = {

      'value-bool': { 20: 'Values' },

      'code-json': { 22: 'JSON' },

    }



    expect(

      addonManifestShouldShowInPaletteList(manifests[0], ['Values'], [], packs),

    ).toBe(false)

    expect(

      addonManifestShouldShowInPaletteList(manifests[1], ['Values'], [], packs),

    ).toBe(true)

    expect(

      addonManifestShouldShowInPaletteList(manifests[1], ['Values'], ['JSON'], packs),

    ).toBe(true)

    expect(

      addonManifestShouldShowInPaletteList(manifests[0], [], ['bool'], packs),

    ).toBe(true)

  })

})


