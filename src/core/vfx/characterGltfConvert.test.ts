import { describe, expect, it } from 'vitest'

import { pickAnmFiles } from './characterGltfConvert'

function mockFile(relativePath: string): File {
  const file = new File([], relativePath.split('/').pop() ?? 'file.anm')
  Object.defineProperty(file, 'webkitRelativePath', {
    value: relativePath,
    configurable: true,
  })
  return file
}

describe('characterGltfConvert pickAnmFiles', () => {
  it('only includes .anm from the animations folder of the active skin', () => {
    const skn = mockFile('Characters/Brand/skins/base/brand.skn')
    const files = [
      skn,
      mockFile('Characters/Brand/skins/base/animations/brand_idle.anm'),
      mockFile('Characters/Brand/skins/base/animations/brand_dance.anm'),
      mockFile('Characters/Brand/skins/base/brand_spell1.anm'),
      mockFile('Characters/Brand/Skins/Skin0/animations/extra.anm'),
    ]

    const picked = pickAnmFiles(files, 'Brand', skn)
    expect(picked.map((file) => file.name)).toEqual(['brand_dance.anm', 'brand_idle.anm'])
  })
})
