import { describe, expect, it } from 'vitest'

import { createEmptyAssetIndex, registerAssetInIndex } from './vfxAssetLookup'
import { summarizeTextureResolution } from './vfxAssetResolve'
import type { VfxWebEmitterBuilt } from './vfxWebBuilder'

const stubSemanticProfile: VfxWebEmitterBuilt['semanticProfile'] = {
  geometry: { kind: 'Billboard', score: 5, reasons: [] },
  material: { kind: 'Solid', score: 0, reasons: [] },
  motion: { kind: 'Static', score: 0, reasons: [] },
  confidence: 0.1,
}

const stubPipeline: VfxWebEmitterBuilt['composablePipeline'] = {
  traits: ['BillboardCamera'],
  geometry: ['preserveScale'],
  material: ['alphaTestCutoff'],
  motion: [],
  geometryKind: 'plane',
  scaleTransform: 'preserveLoL',
  planeFacing: 'camera',
  profile: stubSemanticProfile,
  materialIntent: 'Solid',
  geometryIntent: 'Billboard',
}

function emitter(texturePath: string): VfxWebEmitterBuilt {
  return {
    id: 'e0',
    name: 'test',
    parsed: {} as VfxWebEmitterBuilt['parsed'],
    geometry: 'plane',
    isBillboard: true,
    duration: 1,
    texturePath,
    colorTexturePath: '',
    textureMultPath: '',
    meshPath: null,
    skeletonPath: null,
    animationPath: null,
    semanticProfile: stubSemanticProfile,
    composablePipeline: stubPipeline,
  }
}

describe('summarizeTextureResolution', () => {
  it('pede indexação quando não há índice', () => {
    const warnings = summarizeTextureResolution([emitter('ASSETS/foo.tex')], null)
    expect(warnings[0]).toContain('pasta de assets')
  })

  it('conta texturas resolvidas no índice', () => {
    const index = createEmptyAssetIndex()
    registerAssetInIndex(index, 'ASSETS/Characters/Lux/skin.tex', 'blob:resolved')
    const warnings = summarizeTextureResolution(
      [emitter('ASSETS/Characters/Lux/skin.tex')],
      index,
    )
    expect(warnings.some((line) => line.includes('1/1 resolvidas'))).toBe(true)
  })
})
