import { describe, expect, it } from 'vitest'

import {
  baseNameMatchesChampion,
  championToGltfBaseName,
  gltfFileName,
  normalizeConvertedBaseName,
} from './characterGltfNaming'

describe('characterGltfNaming', () => {
  it('maps champion to lowercase base name without gltf_ prefix', () => {
    expect(championToGltfBaseName('Aatrox')).toBe('aatrox')
    expect(gltfFileName('Brand')).toBe('brand.glb')
  })

  it('sanitizes special characters', () => {
    expect(championToGltfBaseName('K/Sante')).toBe('k_sante')
  })

  it('matches legacy gltf_ prefix base names', () => {
    expect(normalizeConvertedBaseName('gltf_aatrox')).toBe('aatrox')
    expect(baseNameMatchesChampion('gltf_brand', 'Brand')).toBe(true)
    expect(baseNameMatchesChampion('yasuo', 'Yasuo')).toBe(true)
  })
})
