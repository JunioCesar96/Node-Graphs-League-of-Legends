import type { LolSkinnedMeshBundle } from './lolSkinnedMesh'
import type { ParsedLolSkl } from './lolSklParse'

export type VfxCharacterModelStats = {
  vertexCount: number
  triangleCount: number
  jointCount: number
}

export function getCharacterModelStats(
  bundle: LolSkinnedMeshBundle,
  skl: ParsedLolSkl,
): VfxCharacterModelStats {
  const geometry = bundle.bindGeometry
  const position = geometry.getAttribute('position')
  const vertexCount = position?.count ?? 0
  const indexCount = geometry.index?.count ?? 0
  const triangleCount =
    indexCount > 0 ? Math.floor(indexCount / 3) : Math.floor(vertexCount / 3)

  return {
    vertexCount,
    triangleCount,
    jointCount: skl.joints.length,
  }
}

export function formatModelStat(value: number): string {
  return value.toLocaleString('pt-PT')
}
