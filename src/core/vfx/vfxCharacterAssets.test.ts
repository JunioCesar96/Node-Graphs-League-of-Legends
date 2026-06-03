import { describe, expect, it } from 'vitest'

import {
  animationDisplayName,
  buildChampionBaseTexturePath,
  buildChampionLoadscreenPath,
  buildChampionSknPath,
  buildChampionSknRelativePath,
  defaultChampionSknRelativePath,
} from './vfxCharacterAssets'
import { parseVfxEmitterFromBlock } from './ritualParseVfx'

describe('vfxCharacterAssets', () => {
  it('buildChampionSknPath segue convenção LoL', () => {
    expect(buildChampionSknPath('Aatrox', 'Skins/Skin0')).toBe(
      'ASSETS/Characters/Aatrox/Skins/Skin0/aatrox.skn',
    )
  })

  it('defaultChampionSknRelativePath usa skins/base relativo à pasta assets', () => {
    expect(defaultChampionSknRelativePath('Brand')).toBe('Characters/Brand/skins/base/brand.skn')
    expect(buildChampionSknRelativePath('Brand')).toBe('Characters/Brand/skins/base/brand.skn')
  })

  it('resolve paths de textura e loadscreen', () => {
    expect(buildChampionBaseTexturePath('Brand', 'skins/base')).toBe(
      'ASSETS/Characters/Brand/skins/base/brand_base_tx_cm.tex',
    )
    expect(buildChampionLoadscreenPath('Brand', 'skins/base')).toBe(
      'ASSETS/Characters/Brand/skins/base/brandloadscreen.tex',
    )
  })

  it('parse attach bone hash 0x67425298', () => {
    const emitter = parseVfxEmitterFromBlock(`
VfxEmitterDefinitionData {
    emitterName: string = "beam"
    0x67425298: string = "L_ArmNoodle1"
    bindWeight: embed = ValueFloat {
        constantValue: f32 = 1
    }
}
`)
    expect(emitter.attachBoneName).toBe('L_ArmNoodle1')
    expect(emitter.bindWeight?.constant).toBe(1)
  })
})

describe('animationDisplayName', () => {
  it('remove extensão .anm', () => {
    expect(animationDisplayName('ASSETS/Characters/Aatrox/Animations/Idle.anm')).toBe('Idle')
  })
})
