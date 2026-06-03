import { sklPathForSkn } from './lolSklParse'
import { buildVfxWebCatalogFromRitual } from './vfxWebBuilder'
import { ritualContainsVfxSystem } from './ritualParseVfx'

export function collectTexturePathsFromRitual(ritualText: string): string[] {
  if (!ritualContainsVfxSystem(ritualText)) return []

  const built = buildVfxWebCatalogFromRitual(ritualText)
  const paths = new Set<string>()

  for (const entry of built.entries) {
    for (const emitter of entry.scene.emitters) {
      if (emitter.texturePath.trim()) paths.add(emitter.texturePath)
      if (emitter.colorTexturePath.trim()) paths.add(emitter.colorTexturePath)
      if (emitter.textureMultPath.trim()) paths.add(emitter.textureMultPath)
      const reflectionPath = emitter.parsed.reflection?.reflectionMapTexture?.trim()
      if (reflectionPath) paths.add(reflectionPath)
      const palettePath = emitter.parsed.paletteDefinition?.paletteTexture.trim()
      if (palettePath) paths.add(palettePath)
      const erosionPath = emitter.parsed.alphaErosion?.erosionMapName.trim()
      if (erosionPath) paths.add(erosionPath)
    }
  }

  return [...paths]
}

export function collectMeshPathsFromRitual(ritualText: string): string[] {
  if (!ritualContainsVfxSystem(ritualText)) return []

  const built = buildVfxWebCatalogFromRitual(ritualText)
  const paths = new Set<string>()

  for (const entry of built.entries) {
    for (const emitter of entry.scene.emitters) {
      const meshPath = emitter.meshPath ?? emitter.parsed.meshPath
      if (meshPath?.trim()) {
        paths.add(meshPath)
        if (meshPath.toLowerCase().endsWith('.skn')) {
          paths.add(sklPathForSkn(meshPath))
        }
      }
      const skeletonPath = emitter.skeletonPath ?? emitter.parsed.skeletonPath
      const animationPath = emitter.animationPath ?? emitter.parsed.animationPath
      if (skeletonPath?.trim()) paths.add(skeletonPath)
      if (animationPath?.trim()) paths.add(animationPath)
    }
  }

  return [...paths]
}

export function collectRitualAssetPaths(ritualText: string): {
  texturePaths: string[]
  meshPaths: string[]
  skeletonPaths: string[]
  animationPaths: string[]
} {
  const meshPaths = collectMeshPathsFromRitual(ritualText)
  const skeletonPaths = new Set<string>()
  const animationPaths = new Set<string>()

  if (ritualContainsVfxSystem(ritualText)) {
    const built = buildVfxWebCatalogFromRitual(ritualText)
    for (const entry of built.entries) {
      for (const emitter of entry.scene.emitters) {
        if (emitter.parsed.skeletonPath?.trim()) skeletonPaths.add(emitter.parsed.skeletonPath)
        if (emitter.parsed.animationPath?.trim()) animationPaths.add(emitter.parsed.animationPath)
      }
    }
  }

  return {
    texturePaths: collectTexturePathsFromRitual(ritualText),
    meshPaths,
    skeletonPaths: [...skeletonPaths],
    animationPaths: [...animationPaths],
  }
}
