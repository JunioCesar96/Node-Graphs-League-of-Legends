/** Executa estratégias de material → ShaderMaterialDescriptor (single source). */

import type { ParsedVfxEmitterFull } from '../../vfxModel'
import type { VfxEmitterFrameState } from '../../vfxWebAnimation'
import {
  isAdditiveBlendMode,
  resolveEmissiveStrength,
  type VfxMaterialParams,
} from '../../vfxWebMaterials'
import { birthRotationConstant, isGroundLikeBirthRotation, planeBaseRotation } from '../../vfxPrimitives'
import { resolveEmitterEmbedRgba } from '../../vfxColor'
import { placeholderColorForMaterialIntent } from '../vfxMaterialIntent'
import type { ComposableRenderPipeline } from '../vfxSemanticTypes'
import type { ShaderMaterialDescriptor } from '../../vfxWebMaterials'
import { buildShaderFeatureFlags } from './shaderFeatureFlags'
import { executeGeometryStrategies } from './geometryStrategyExecutor'
import type { EmitterFeatures } from '../vfxFeatureRegistry'
import {
  resolveAlphaCutoff,
  resolveDepthWrite,
  resolveRenderOrder,
  shouldAlphaTest,
  shouldFlipNormals,
} from '../../vfxRenderFlags'
import { resolvePaletteUniforms } from '../../vfxPalette'
import { distortionStrength } from '../../vfxDistortion'
import {
  needsUvRotationSafeMarginForEmitter,
  resolveUvRotationSafeMarginG,
} from '../../vfxUvRotationSafeMargin'

function resolvePolygonOffset(
  emitter: ParsedVfxEmitterFull,
  shaderFeatures: ReturnType<typeof buildShaderFeatureFlags>,
): { enabled: boolean; factor: number; units: number } {
  if (shaderFeatures.depthBias && emitter.depthBiasFactors) {
    return {
      enabled: true,
      factor: emitter.depthBiasFactors[0],
      units: emitter.depthBiasFactors[1],
    }
  }
  if (shaderFeatures.groundNavmeshClip) {
    return { enabled: true, factor: -1, units: -1 }
  }
  return { enabled: false, factor: 0, units: 0 }
}

export type BuildShaderDescriptorInput = {
  emitter: ParsedVfxEmitterFull
  frame: Pick<
    VfxEmitterFrameState,
    'opacity' | 'color' | 'spriteOffset' | 'uvScroll' | 'uvRotation' | 'erosionDrive' | 'distortionDrive'
  >
  groundClipZ?: number
  pipeline: ComposableRenderPipeline
  features: EmitterFeatures
  textureUrl: string | null
  textureIsDds: boolean
  colorTextureUrl: string | null
  colorTextureIsDds: boolean
  textureMultUrl: string | null
  textureMultIsDds: boolean
  reflectionCubeUrl?: string | null
  reflectionCubeIsDds?: boolean
  paletteTextureUrl?: string | null
  paletteTextureIsDds?: boolean
  erosionTextureUrl?: string | null
  erosionTextureIsDds?: boolean
  distortionTextureUrl?: string | null
  distortionTextureIsDds?: boolean
  renderOptions?: { particleIndex?: number; particleNormalized?: number }
}

function baseMaterialFields(
  input: BuildShaderDescriptorInput,
  shaderFeatures: ReturnType<typeof buildShaderFeatureFlags>,
): Omit<VfxMaterialParams, 'materialIntent' | 'activeTraits'> {
  const { emitter, frame, pipeline } = input
  const texDiv = emitter.texDiv ?? [1, 1]
  const cols = Math.max(1, Math.round(texDiv[0]))
  const rows = Math.max(1, Math.round(texDiv[1]))
  const placeholder = placeholderColorForMaterialIntent(pipeline.materialIntent)
  const particleNormalized = input.renderOptions?.particleNormalized ?? 0
  const embedTint = resolveEmitterEmbedRgba(emitter.color, emitter.birthColor, particleNormalized)
  const frameColor = frame.color
  const tintRgba: [number, number, number, number] = [
    frameColor[0],
    frameColor[1],
    frameColor[2],
    embedTint[3],
  ]
  const baseColor: [number, number, number] = [
    tintRgba[0] || placeholder[0],
    tintRgba[1] || placeholder[1],
    tintRgba[2] || placeholder[2],
  ]
  const colorMultiply = (emitter.colorRenderFlags & 1) !== 0 || Boolean(emitter.particleColorTexture.trim())

  const multScale = emitter.textureMult?.uvScale ?? [1, 1]
  const multOffset = emitter.textureMult?.birthUvOffset?.constant
  const multOffsetVec: [number, number] =
    Array.isArray(multOffset) && multOffset.length >= 2
      ? [Number(multOffset[0]), Number(multOffset[1])]
      : [0, 0]

  const planeFacing = pipeline.planeFacing
  const reflection = emitter.reflection
  const fresnelColor = reflection?.reflectionFresnelColor ?? [1, 1, 1, 0.5]
  const reflectionMix = reflection
    ? Math.min(
        1,
        reflection.reflectionFresnel *
          (reflection.reflectionOpacityDirect * 0.65 + reflection.reflectionOpacityGlancing * 0.35 + 0.15),
      )
    : 0
  const fresnel = reflection && reflection.reflectionFresnel > 0 ? reflectionMix : 0
  const isAdditive =
    shaderFeatures.additiveEmissive || isAdditiveBlendMode(emitter.blendMode)
  const alphaRef = emitter.alphaRef
  const paletteUniforms = resolvePaletteUniforms(
    emitter.paletteDefinition,
    input.renderOptions?.particleNormalized ?? 0,
  )

  const spriteCols = shaderFeatures.flipbook ? cols : 1
  const spriteRows = shaderFeatures.flipbook ? rows : 1

  let depthWrite = resolveDepthWrite(isAdditive, alphaRef)
  if (shaderFeatures.softAlpha) depthWrite = false
  if (shaderFeatures.groundNavmeshClip) depthWrite = alphaRef > 0

  return {
    baseColor,
    tintRgba,
    colorMultiply,
    opacity: frame.opacity,
    blendMode: emitter.blendMode,
    isAdditive,
    textureUrl: input.textureUrl ?? input.colorTextureUrl,
    textureIsDds: input.textureUrl ? input.textureIsDds : input.colorTextureIsDds,
    colorTextureUrl:
      input.textureUrl && input.colorTextureUrl && input.colorTextureUrl !== input.textureUrl
        ? input.colorTextureUrl
        : null,
    colorTextureIsDds: input.colorTextureIsDds,
    textureMultUrl: shaderFeatures.uvScrollMult ? input.textureMultUrl : null,
    textureMultIsDds: input.textureMultIsDds,
    paletteTextureUrl:
      shaderFeatures.palette && input.paletteTextureUrl ? input.paletteTextureUrl : null,
    paletteTextureIsDds: input.paletteTextureIsDds ?? false,
    paletteCount: paletteUniforms.paletteCount,
    paletteSelector: paletteUniforms.paletteSelector,
    paletteMixMask: paletteUniforms.paletteMixMask,
    spriteCols,
    spriteRows,
    spriteOffset: frame.spriteOffset,
    uvScroll: frame.uvScroll,
    uvMultOffset: [
      multOffsetVec[0] + frame.uvScroll[0] * multScale[0],
      multOffsetVec[1] + frame.uvScroll[1] * multScale[1],
    ],
    uvScale: multScale,
    uvRotation: frame.uvRotation,
    flipNormals: shouldFlipNormals(
      emitter.miscRenderFlags,
      emitter.blendMode,
      emitter.disableBackfaceCull,
    ),
    isBillboard:
      ['plane', 'ray', 'arbitrary_quad', 'trail', 'beam', 'planar_projection'].includes(
        emitter.primitiveKind,
      ) &&
      !emitter.isGroundLayer &&
      !(() => {
        const ritual = birthRotationConstant(emitter.birthRotation0)
        return ritual != null && isGroundLikeBirthRotation(ritual)
      })(),
    isGroundLayer: emitter.isGroundLayer,
    primitiveKind: emitter.primitiveKind,
    planeFacing,
    planeBaseRotation: planeBaseRotation(planeFacing),
    emissiveStrength: shaderFeatures.additiveEmissive
      ? resolveEmissiveStrength(emitter.blendMode)
      : resolveEmissiveStrength(emitter.blendMode) * (shaderFeatures.softAlpha ? 0.85 : 1),
    fresnel,
    fresnelColor: [fresnelColor[0], fresnelColor[1], fresnelColor[2]],
    reflectionCubeUrl: input.reflectionCubeUrl ?? null,
    reflectionCubeIsDds: input.reflectionCubeIsDds ?? false,
    reflectionMix,
    alphaRef,
    alphaCutoff: resolveAlphaCutoff(alphaRef),
    alphaTest: shaderFeatures.alphaTest && shouldAlphaTest(alphaRef, isAdditive),
    depthWrite,
    renderOrder: resolveRenderOrder(
      emitter.pass,
      input.renderOptions?.particleIndex ?? 0,
      emitter.importance,
    ),
    colorLookUpScales: emitter.colorLookUpScales,
    colorLookUpTypeX: emitter.colorLookUpTypeX,
    colorLookUpTypeY: emitter.colorLookUpTypeY,
    erosionTextureUrl: shaderFeatures.erosion ? input.erosionTextureUrl ?? null : null,
    erosionTextureIsDds: input.erosionTextureIsDds ?? false,
    erosionDrive: shaderFeatures.erosion ? (frame.erosionDrive ?? 1) : 1,
    erosionChannelMixer: emitter.alphaErosion?.erosionMapChannelMixer ?? [1, 0, 0, 0],
  }
}

export function executeMaterialStrategies(input: BuildShaderDescriptorInput): ShaderMaterialDescriptor {
  const shaderFeatures = buildShaderFeatureFlags(input.pipeline, input.features)
  const base = baseMaterialFields(input, shaderFeatures)
  const geometryKind = executeGeometryStrategies(input.pipeline, input.features)
  const polygon = resolvePolygonOffset(input.emitter, shaderFeatures)
  const uvRotationSafeMargin = needsUvRotationSafeMarginForEmitter(input.emitter, geometryKind)
  const uvRotationSafeMarginG = uvRotationSafeMargin
    ? resolveUvRotationSafeMarginG(input.emitter.texDiv)
    : 1

  return {
    ...base,
    materialIntent: input.pipeline.materialIntent,
    activeTraits: input.pipeline.traits,
    shaderFeatures,
    geometryKind,
    uvRotationSafeMargin,
    uvRotationSafeMarginG,
    polygonOffset: polygon.enabled,
    polygonOffsetFactor: polygon.factor,
    polygonOffsetUnits: polygon.units,
    groundClipZ: input.groundClipZ ?? null,
    softDepthFade: shaderFeatures.softAlpha,
    distortionTextureUrl: shaderFeatures.distortion ? input.distortionTextureUrl ?? null : null,
    distortionTextureIsDds: input.distortionTextureIsDds ?? false,
    distortionStrength: distortionStrength(
      input.emitter.distortionDefinition,
      input.frame.distortionDrive ?? 1,
    ),
  }
}

