import { assetIndexSize, lookupTextureUrlForRitual } from './vfxAssetIndex'
import type { VfxAssetFileIndex } from './vfxAssetIndex'
import type { VfxWebEmitterBuilt } from './vfxWebBuilder'

function collectEmitterTexturePaths(emitter: VfxWebEmitterBuilt): string[] {
  const paths: string[] = []
  if (emitter.texturePath.trim()) paths.push(emitter.texturePath)
  if (emitter.colorTexturePath?.trim() && emitter.colorTexturePath !== emitter.texturePath) {
    paths.push(emitter.colorTexturePath)
  }
  if (emitter.textureMultPath.trim() && emitter.textureMultPath !== emitter.texturePath) {
    paths.push(emitter.textureMultPath)
  }
  return paths
}

export function summarizeTextureResolution(
  emitters: VfxWebEmitterBuilt[],
  assetIndex: VfxAssetFileIndex | null,
): string[] {
  if (!assetIndex || !assetIndexSize(assetIndex)) {
    return [
      'A aguardar pasta de assets — na primeira vez o browser pede a pasta do .wad.client; depois carrega sozinho.',
    ]
  }

  const uniquePaths = new Set<string>()
  for (const emitter of emitters) {
    for (const path of collectEmitterTexturePaths(emitter)) {
      uniquePaths.add(path)
    }
  }

  if (!uniquePaths.size) {
    return [`Índice: ${assetIndexSize(assetIndex)} ficheiro(s) — nenhum caminho de textura no efeito activo.`]
  }

  let resolved = 0
  const missing: string[] = []
  for (const path of uniquePaths) {
    if (lookupTextureUrlForRitual(assetIndex, path)) resolved += 1
    else missing.push(path)
  }

  const warnings: string[] = [
    `Índice: ${assetIndexSize(assetIndex)} ficheiro(s) em ASSETS/.`,
    `Texturas do efeito: ${resolved}/${uniquePaths.size} resolvidas.`,
  ]

  if (missing.length) {
    const sample = missing
      .slice(0, 2)
      .map((path) => path.replace(/^ASSETS\//i, ''))
      .join(', ')
    warnings.push(
      `Em falta (${missing.length}): ${sample}${missing.length > 2 ? '…' : ''} — confira .dds/.png ao lado do .tex na pasta.`,
    )
  }

  return warnings
}
