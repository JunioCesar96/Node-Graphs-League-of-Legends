/**
 * Registry formal de features estruturais (contrato público da engine semântica).
 */

import type { EmitterFeatureVector } from './vfxEmitterFeatures'
import type { LoLGroundQuadScaleKind } from './vfxSemanticTypes'

/** Features emergentes + campos base parseados (sem nome/textura). */
export type EmitterFeatures = EmitterFeatureVector & {
  blendMode: number
  isDecalLike: boolean
  isBeamLike: boolean
  isRingLike: boolean
  isFlipbook: boolean
  isMeshBased: boolean
}

export type FeatureDefinitionMeta = {
  id: keyof EmitterFeatures | string
  description: string
}

export const FEATURE_DEFINITIONS: FeatureDefinitionMeta[] = [
  { id: 'groundLayer', description: 'isGroundLayer do BIN' },
  { id: 'isDecalLike', description: 'ground + quad + flat + twoLargeAxes' },
  { id: 'isBeamLike', description: 'ray/beam primitive ou eixo extremo' },
  { id: 'isRingLike', description: 'ground + flipbook + eixo dominante' },
  { id: 'flipbook', description: 'numFrames>1 ou texDiv multi-célula' },
  { id: 'additiveBlend', description: 'blendMode 2 ou 4' },
]

/** Enriquece vector base com flags derivados e blendMode. */
export function enrichEmitterFeatures(
  base: EmitterFeatureVector,
  blendMode: number,
): EmitterFeatures {
  const isDecalLike =
    base.groundLayer && base.primitiveArbitraryQuad && base.isFlat && base.twoLargeAxes
  const isBeamLike = base.primitiveRay || base.primitiveBeam || base.extremeLengthAxis
  const isRingLike =
    base.groundLayer &&
    base.flipbook &&
    (base.dominantSingleAxis || base.groundScaleKind === 'flipbookSquare')

  return {
    ...base,
    blendMode,
    isDecalLike,
    isBeamLike,
    isRingLike,
    isFlipbook: base.flipbook,
    isMeshBased: base.primitiveMesh || base.hasMeshAsset,
  }
}

export function deriveGroundScaleKindFromFeatures(
  features: Pick<EmitterFeatures, 'birthScale' | 'groundScaleKind'>,
  texDiv?: [number, number] | null,
): LoLGroundQuadScaleKind | undefined {
  return features.groundScaleKind
}
