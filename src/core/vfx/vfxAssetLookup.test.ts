import { describe, expect, it } from 'vitest'

import {
  createEmptyAssetIndex,
  lookupTextureForRitual,
  registerAssetInIndex,
  registerBasenameInIndex,
  ritualKeyFromRelativePath,
} from './vfxAssetLookup'

describe('vfxAssetLookup', () => {
  it('normaliza webkitRelativePath com assets/', () => {
    expect(
      ritualKeyFromRelativePath('Lux.wad.client/assets/Characters/Lux/Skins/Skin0/Particles/glow.tex'),
    ).toBe('ASSETS/Characters/Lux/Skins/Skin0/Particles/glow.tex')
  })

  it('resolve por basename quando o skin folder difere (Base vs Skin0)', () => {
    const index = createEmptyAssetIndex()
    registerAssetInIndex(
      index,
      'ASSETS/Characters/Lux/Skins/Skin0/Particles/Lux_Base_R_Glow.tex',
      'blob:glow',
    )

    const hit = lookupTextureForRitual(
      index,
      'ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_Glow.tex',
    )
    expect(hit?.url).toBe('blob:glow')
    expect(hit?.matchKind).toBe('basename')
  })

  it('indexa ficheiro órfão só pelo nome (pasta Particles)', () => {
    const index = createEmptyAssetIndex()
    registerBasenameInIndex(index, 'Zac_base_R_Puddle.tex', 'blob:puddle')

    const hit = lookupTextureForRitual(
      index,
      'ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Puddle.tex',
    )
    expect(hit?.url).toBe('blob:puddle')
    expect(hit?.matchKind).toBe('basename')
  })

  it('resolve candidato .dds', () => {
    const index = createEmptyAssetIndex()
    registerAssetInIndex(index, 'ASSETS/Shared/Particles/rainbowhalo.dds', 'blob:dds', { isDds: true })

    const hit = lookupTextureForRitual(index, 'ASSETS/Shared/Particles/rainbowhalo.tex')
    expect(hit?.url).toBe('blob:dds')
    expect(hit?.isDds).toBe(true)
  })
})
