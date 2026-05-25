import type { ParsedVfxEmitterFull } from './vfxModel'
import type { VfxEmitterFrameState } from './vfxWebAnimation'
import {
  birthRotationConstant,
  planeBaseRotation,
  resolvePlaneFacing,
  type VfxPlaneFacing,
} from './vfxPrimitives'
import { resolvePaletteUniforms } from './vfxPalette'
import {
  resolveAlphaCutoff,
  resolveDepthWrite,
  resolveRenderOrder,
  shouldAlphaTest,
  shouldFlipNormals,
} from './vfxRenderFlags'

export type VfxMaterialParams = {
  baseColor: [number, number, number]
  opacity: number
  blendMode: number
  isAdditive: boolean
  textureUrl: string | null
  textureIsDds: boolean
  colorTextureUrl: string | null
  colorTextureIsDds: boolean
  textureMultUrl: string | null
  textureMultIsDds: boolean
  paletteTextureUrl: string | null
  paletteTextureIsDds: boolean
  paletteCount: number
  paletteSelector: number
  paletteMixMask: [number, number, number, number]
  spriteCols: number
  spriteRows: number
  spriteOffset: [number, number]
  uvScroll: [number, number]
  uvMultOffset: [number, number]
  uvScale: [number, number]
  uvRotation: number
  isBillboard: boolean
  isGroundLayer: boolean
  primitiveKind: string
  planeFacing: VfxPlaneFacing
  planeBaseRotation: [number, number, number]
  /** Multiplicador de emissão (Blender: 8 additive, 3 alpha). */
  emissiveStrength: number
  fresnel: number
  fresnelColor: [number, number, number]
  reflectionCubeUrl: string | null
  reflectionCubeIsDds: boolean
  reflectionMix: number
  flipNormals: boolean
  alphaRef: number
  alphaCutoff: number
  alphaTest: boolean
  depthWrite: boolean
  renderOrder: number
  colorLookUpScales: [number, number] | null
  colorLookUpTypeX: number
  colorLookUpTypeY: number
  erosionTextureUrl: string | null
  erosionTextureIsDds: boolean
  erosionDrive: number
  erosionChannelMixer: [number, number, number, number]
}

const EMITTER_PLACEHOLDER_COLORS: Record<string, [number, number, number]> = {
  Ring: [0.2, 0.85, 0.35],
  Splat: [0.95, 0.75, 0.15],
  Juice: [0.35, 0.55, 1],
}

export function resolveEmitterPlaceholderColor(name: string): [number, number, number] {
  return EMITTER_PLACEHOLDER_COLORS[name] ?? [0.7, 0.7, 0.85]
}

/** Mapa alinhado a vfx_materials.py (_BLEND_MODE_MAP). */
export function isAdditiveBlendMode(blendMode: number): boolean {
  return blendMode === 2 || blendMode === 4
}

export function resolveEmissiveStrength(blendMode: number): number {
  return isAdditiveBlendMode(blendMode) ? 8 : 3
}

export function buildMaterialParams(
  emitter: ParsedVfxEmitterFull,
  frame: Pick<VfxEmitterFrameState, 'opacity' | 'color' | 'spriteOffset' | 'uvScroll' | 'erosionDrive'>,
  textureUrl: string | null,
  textureIsDds: boolean,
  colorTextureUrl: string | null,
  colorTextureIsDds: boolean,
  textureMultUrl: string | null,
  textureMultIsDds: boolean,
  reflectionCubeUrl: string | null = null,
  reflectionCubeIsDds = false,
  paletteTextureUrl: string | null = null,
  paletteTextureIsDds = false,
  renderOptions?: { particleIndex?: number; particleNormalized?: number },
): VfxMaterialParams {
  const placeholder = resolveEmitterPlaceholderColor(emitter.name)
  const frameColor = frame.color
  const baseColor: [number, number, number] = [
    frameColor[0] || placeholder[0],
    frameColor[1] || placeholder[1],
    frameColor[2] || placeholder[2],
  ]

  const texDiv = emitter.texDiv ?? [1, 1]
  const cols = Math.max(1, Math.round(texDiv[0]))
  const rows = Math.max(1, Math.round(texDiv[1]))
  const multScale = emitter.textureMult?.uvScale ?? [1, 1]
  const multOffset = emitter.textureMult?.birthUvOffset?.constant
  const multOffsetVec: [number, number] =
    Array.isArray(multOffset) && multOffset.length >= 2
      ? [Number(multOffset[0]), Number(multOffset[1])]
      : [0, 0]

  const planeFacing = resolvePlaneFacing(
    birthRotationConstant(emitter.birthRotation0),
    emitter.isGroundLayer,
  )

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
  const isAdditive = isAdditiveBlendMode(emitter.blendMode)
  const alphaRef = emitter.alphaRef
  const paletteUniforms = resolvePaletteUniforms(
    emitter.paletteDefinition,
    renderOptions?.particleNormalized ?? 0,
  )
  const hasPalette = Boolean(paletteTextureUrl && emitter.paletteDefinition?.paletteTexture.trim())

  return {
    baseColor,
    opacity: frame.opacity,
    blendMode: emitter.blendMode,
    isAdditive,
    textureUrl: textureUrl ?? colorTextureUrl,
    textureIsDds: textureUrl ? textureIsDds : colorTextureIsDds,
    colorTextureUrl: textureUrl && colorTextureUrl && colorTextureUrl !== textureUrl ? colorTextureUrl : null,
    colorTextureIsDds,
    textureMultUrl,
    textureMultIsDds,
    paletteTextureUrl: hasPalette ? paletteTextureUrl : null,
    paletteTextureIsDds,
    paletteCount: paletteUniforms.paletteCount,
    paletteSelector: paletteUniforms.paletteSelector,
    paletteMixMask: paletteUniforms.paletteMixMask,
    spriteCols: cols,
    spriteRows: rows,
    spriteOffset: frame.spriteOffset,
    uvScroll: frame.uvScroll,
    uvMultOffset: [
      multOffsetVec[0] + frame.uvScroll[0] * multScale[0],
      multOffsetVec[1] + frame.uvScroll[1] * multScale[1],
    ],
    uvScale: multScale,
    uvRotation: (emitter.uvRotation * Math.PI) / 180,
    flipNormals: shouldFlipNormals(
      emitter.miscRenderFlags,
      emitter.blendMode,
      emitter.disableBackfaceCull,
    ),
    isBillboard: ['plane', 'ray', 'arbitrary_quad', 'trail', 'beam', 'planar_projection'].includes(
      emitter.primitiveKind,
    ),
    isGroundLayer: emitter.isGroundLayer,
    primitiveKind: emitter.primitiveKind,
    planeFacing,
    planeBaseRotation: planeBaseRotation(planeFacing),
    emissiveStrength: resolveEmissiveStrength(emitter.blendMode),
    fresnel,
    fresnelColor: [fresnelColor[0], fresnelColor[1], fresnelColor[2]],
    reflectionCubeUrl,
    reflectionCubeIsDds,
    reflectionMix,
    alphaRef,
    alphaCutoff: resolveAlphaCutoff(alphaRef),
    alphaTest: shouldAlphaTest(alphaRef, isAdditive),
    depthWrite: resolveDepthWrite(isAdditive, alphaRef),
    renderOrder: resolveRenderOrder(
      emitter.pass,
      renderOptions?.particleIndex ?? 0,
      emitter.importance,
    ),
    colorLookUpScales: emitter.colorLookUpScales,
    colorLookUpTypeX: emitter.colorLookUpTypeX,
    colorLookUpTypeY: emitter.colorLookUpTypeY,
    erosionTextureUrl: null,
    erosionTextureIsDds: false,
    erosionDrive: frame.erosionDrive ?? 1,
    erosionChannelMixer: emitter.alphaErosion?.erosionMapChannelMixer ?? [1, 0, 0, 0],
  }
}

export function applyErosionMaterialParams(
  params: VfxMaterialParams,
  erosionTextureUrl: string | null,
  erosionTextureIsDds: boolean,
  erosionDrive: number,
): VfxMaterialParams {
  return {
    ...params,
    erosionTextureUrl,
    erosionTextureIsDds,
    erosionDrive,
    erosionChannelMixer: params.erosionChannelMixer,
  }
}
