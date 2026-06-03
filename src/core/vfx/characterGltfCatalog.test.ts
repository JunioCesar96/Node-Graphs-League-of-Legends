import { describe, expect, it } from 'vitest'

import {
  buildConvertedBaseNameSet,
  isChampionConverted,
  isChampionInConvertedSet,
} from './characterGltfCatalog'

describe('characterGltfCatalog', () => {
  const models = [
    { baseName: 'aatrox', format: 'gltf' },
    { baseName: 'gltf_brand', format: 'gltf' },
  ]

  it('detects converted champions', () => {
    expect(isChampionConverted('Aatrox', models)).toBe(true)
    expect(isChampionConverted('Brand', models)).toBe(true)
    expect(isChampionConverted('Yasuo', models)).toBe(false)
  })

  it('builds lookup set for list highlighting', () => {
    const set = buildConvertedBaseNameSet(models)
    expect(isChampionInConvertedSet('Aatrox', set)).toBe(true)
    expect(isChampionInConvertedSet('Brand', set)).toBe(true)
    expect(isChampionInConvertedSet('Yasuo', set)).toBe(false)
  })
})
