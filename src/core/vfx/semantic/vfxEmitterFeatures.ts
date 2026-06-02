/** Extração de features estruturais a partir de RawEmitterDefinition (sem nome/textura). */

import type { VfxEmbedValue } from '../vfxModel'
import { isAdditiveBlendMode } from '../vfxWebMaterials'
import { birthRotationConstant, isGroundLikeBirthRotation, resolvePlaneFacing } from '../vfxPrimitives'
import {
  miscRenderFlagsInvertFaces,
  resolveAlphaCutoff,
  resolveDepthWrite,
  shouldAlphaTest,
} from '../vfxRenderFlags'
import { enrichEmitterFeatures, type EmitterFeatures } from './vfxFeatureRegistry'
import type { LoLGroundQuadScaleKind } from './vfxSemanticTypes'
import type { RawEmitterDefinition } from './vfxRawEmitter'

export type { EmitterFeatures } from './vfxFeatureRegistry'

export const LOL_GROUND_QUAD_SCALE_THRESHOLDS = {
  STRIP_RATIO: 10,
  DECAL_SIMILARITY: 1 / 1.3,
  THICKNESS_RATIO: 0.2,
  FLIPBOOK_UNIT_PAIR_RATIO: 1.1,
} as const

export type EmitterFeatureVector = {
  primitiveKind: string
  primitiveArbitraryQuad: boolean
  primitiveRay: boolean
  primitiveTrail: boolean
  primitiveBeam: boolean
  primitiveMesh: boolean
  primitivePlanarProjection: boolean
  primitivePlaneLike: boolean
  hasMeshAsset: boolean

  groundLayer: boolean
  /** `birthRotation0` de decal sem `isGroundLayer` (ex. {-90,-90,0}). */
  groundLikeBirthRotation: boolean
  directionOriented: boolean
  billboardCandidate: boolean
  disableBackfaceCull: boolean
  miscRenderFlags: number

  additiveBlend: boolean
  alphaBlend: boolean
  alphaTest: boolean
  depthWrite: boolean
  invertFaces: boolean

  flipbook: boolean
  frameCount: number
  uvScroll: boolean
  erosion: boolean
  hasPaletteGradient: boolean
  hasTextureMult: boolean

  birthScale: [number, number, number]
  dominantAxisCount: number
  aspectRatio: number
  isFlat: boolean
  isHuge: boolean
  isTiny: boolean
  twoLargeAxes: boolean
  dominantSingleAxis: boolean
  extremeLengthAxis: boolean

  rotationalVelocity: boolean
  orbitalVelocity: boolean
  worldAcceleration: boolean
  birthVelocity: boolean
  planeFacing: ReturnType<typeof resolvePlaneFacing>

  groundScaleKind?: LoLGroundQuadScaleKind
  navmeshMask: boolean
  hasDistortion: boolean
  hasDepthBias: boolean
  meshRenderFlags: number
  particleUvScroll: boolean
  particleLocalOrientation: boolean
  isRotationEnabled: boolean
  hasRotation0: boolean
  flexShape: boolean
}

function embedVec3(embed: VfxEmbedValue | null, fallback: [number, number, number]): [number, number, number] {
  if (!embed?.constant) return fallback
  const value = embed.constant
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]), Number(value[1]), Number(value[2])]
  }
  return fallback
}

function hasDynamics(embed: VfxEmbedValue | null | undefined): boolean {
  return embed?.dynamics != null
}

export function sortedAbsScale(scale: [number, number, number]): [number, number, number] {
  return [...scale.map((c) => Math.abs(Number(c)))].sort((a, b) => b - a) as [number, number, number]
}

export function isFlipbookTexDiv(texDiv: [number, number] | null | undefined): boolean {
  const [cols, rows] = texDiv ?? [1, 1]
  const c = Math.max(1, Math.round(Math.abs(cols)))
  const r = Math.max(1, Math.round(Math.abs(rows)))
  return c > 1 || r > 1
}

/** Classificação de birthScale para ground quads (assinatura geométrica). */
export function deriveGroundScaleKind(
  scale: [number, number, number],
  texDiv?: [number, number] | null,
): LoLGroundQuadScaleKind {
  if (isFlipbookTexDiv(texDiv)) return 'flipbookSquare'

  const [max1, max2, min] = sortedAbsScale(scale)
  const { STRIP_RATIO, DECAL_SIMILARITY, THICKNESS_RATIO, FLIPBOOK_UNIT_PAIR_RATIO } =
    LOL_GROUND_QUAD_SCALE_THRESHOLDS

  if (max1 <= 0) return 'neutral'
  if (max2 <= 0) return max1 / Math.max(min, 1e-9) > STRIP_RATIO ? 'strip' : 'neutral'

  const dominantRatio = max1 / max2
  const secondaryPairRatio = max2 / Math.max(min, 1e-9)

  if (
    dominantRatio > STRIP_RATIO &&
    max2 / max1 < THICKNESS_RATIO &&
    min / max1 < THICKNESS_RATIO &&
    secondaryPairRatio < FLIPBOOK_UNIT_PAIR_RATIO
  ) {
    return 'flipbookSquare'
  }

  if (dominantRatio > STRIP_RATIO) return 'strip'
  if (max2 / max1 >= DECAL_SIMILARITY && min / max1 < THICKNESS_RATIO) return 'decal'
  return 'neutral'
}

function countNonZeroAxes(scale: [number, number, number]): number {
  return scale.filter((v) => Math.abs(Number(v)) >= 1e-6).length
}

function analyzeScaleGeometry(scale: [number, number, number]): {
  dominantAxisCount: number
  aspectRatio: number
  isFlat: boolean
  isHuge: boolean
  isTiny: boolean
  twoLargeAxes: boolean
  dominantSingleAxis: boolean
  extremeLengthAxis: boolean
} {
  const [max1, max2, min] = sortedAbsScale(scale)
  const dominantAxisCount = countNonZeroAxes(scale)
  const aspectRatio = max2 > 0 ? max1 / max2 : max1
  const isFlat = max1 > 0 && min / max1 < LOL_GROUND_QUAD_SCALE_THRESHOLDS.THICKNESS_RATIO
  const isHuge = max1 >= 200
  const isTiny = max1 > 0 && max1 < 30
  const twoLargeAxes =
    max1 > 0 &&
    max2 / max1 >= LOL_GROUND_QUAD_SCALE_THRESHOLDS.DECAL_SIMILARITY &&
    min / max1 < LOL_GROUND_QUAD_SCALE_THRESHOLDS.THICKNESS_RATIO
  const dominantSingleAxis = max1 > 0 && max1 / Math.max(max2, 1e-9) > LOL_GROUND_QUAD_SCALE_THRESHOLDS.STRIP_RATIO
  const extremeLengthAxis = aspectRatio > LOL_GROUND_QUAD_SCALE_THRESHOLDS.STRIP_RATIO

  return {
    dominantAxisCount,
    aspectRatio,
    isFlat,
    isHuge,
    isTiny,
    twoLargeAxes,
    dominantSingleAxis,
    extremeLengthAxis,
  }
}

export function extractEmitterFeatures(raw: RawEmitterDefinition): EmitterFeatures {
  const pk = raw.primitiveKind
  const primitiveArbitraryQuad = pk === 'arbitrary_quad'
  const primitiveRay = pk === 'ray'
  const primitiveTrail = pk === 'trail'
  const primitiveBeam = pk === 'beam'
  const primitiveMesh = pk === 'mesh'
  const primitivePlanarProjection = pk === 'planar_projection'
  const primitivePlaneLike =
    pk === 'plane' || primitiveArbitraryQuad || primitiveRay || primitiveTrail || primitiveBeam || primitivePlanarProjection

  const birthScale = embedVec3(raw.birthScale0, [1, 1, 1])
  const scaleGeom = analyzeScaleGeometry(birthScale)
  const additiveBlend = isAdditiveBlendMode(raw.blendMode)
  const alphaBlend = !additiveBlend
  const alphaTest = shouldAlphaTest(raw.alphaRef, additiveBlend)
  const depthWrite = resolveDepthWrite(additiveBlend, raw.alphaRef)
  const invertFaces = miscRenderFlagsInvertFaces(raw.miscRenderFlags) && !raw.disableBackfaceCull

  const sheetFrames = (raw.texDiv?.[0] ?? 1) * (raw.texDiv?.[1] ?? 1)
  const frameCount = Math.max(1, raw.numFrames ?? sheetFrames)
  const flipbook = frameCount > 1 || isFlipbookTexDiv(raw.texDiv)

  const birthRot = birthRotationConstant(raw.birthRotation0)
  const groundLikeBirthRotation = birthRot != null && isGroundLikeBirthRotation(birthRot)
  const planeFacing = resolvePlaneFacing(birthRot, raw.isGroundLayer)

  const groundScaleKind =
    raw.isGroundLayer && primitiveArbitraryQuad
      ? deriveGroundScaleKind(birthScale, raw.texDiv)
      : undefined

  const base: EmitterFeatureVector = {
    primitiveKind: pk,
    primitiveArbitraryQuad,
    primitiveRay,
    primitiveTrail,
    primitiveBeam,
    primitiveMesh,
    primitivePlanarProjection,
    primitivePlaneLike,
    hasMeshAsset: Boolean(raw.meshPath?.trim()),

    groundLayer: raw.isGroundLayer,
    groundLikeBirthRotation,
    directionOriented: raw.isDirectionOriented,
    billboardCandidate: primitivePlaneLike && !raw.isGroundLayer && !groundLikeBirthRotation,
    disableBackfaceCull: raw.disableBackfaceCull,
    miscRenderFlags: raw.miscRenderFlags,

    additiveBlend,
    alphaBlend,
    alphaTest,
    depthWrite,
    invertFaces,

    flipbook,
    frameCount,
    uvScroll: hasDynamics(raw.birthUvScrollRate) || raw.textureMult?.uvScroll != null,
    erosion: raw.alphaErosion != null,
    hasPaletteGradient: raw.paletteDefinition != null,
    hasTextureMult: raw.textureMult != null,

    birthScale,
    ...scaleGeom,

    rotationalVelocity: hasDynamics(raw.birthRotationalVelocity0),
    orbitalVelocity: false,
    worldAcceleration: hasDynamics(raw.worldAcceleration) || hasDynamics(raw.birthAcceleration),
    birthVelocity: hasDynamics(raw.birthVelocity) || embedVec3(raw.birthVelocity, [0, 0, 0]).some((v) => Math.abs(v) > 1e-3),

    planeFacing,
    groundScaleKind,
    navmeshMask: raw.useNavmeshMask,
    hasDistortion: raw.distortionDefinition != null,
    hasDepthBias: raw.depthBiasFactors != null,
    meshRenderFlags: raw.meshRenderFlags,
    particleUvScroll: hasDynamics(raw.particleUVScrollRate),
    particleLocalOrientation: raw.particleIsLocalOrientation,
    isRotationEnabled: raw.isRotationEnabled,
    hasRotation0: raw.rotation0 != null,
    flexShape: raw.flexShape != null,
  }

  return enrichEmitterFeatures(base, raw.blendMode)
}

/** Usado por materiais — cutoff alpha sem depender de nome. */
export function featureAlphaCutoff(raw: RawEmitterDefinition): number {
  return resolveAlphaCutoff(raw.alphaRef)
}
