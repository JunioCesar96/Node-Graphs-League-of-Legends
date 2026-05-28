import type {
  ComposableRenderPipeline,
  EmitterPrimitiveGeometryKind,
  MaterialIntent,
  ShaderFeatureFlags,
} from './semantic/vfxSemanticTypes'
import { extractEmitterFeatures } from './semantic/vfxEmitterFeatures'
import { getComposablePipeline } from './semantic/vfxRenderStrategy'
import {
  executeMaterialStrategies,
  type BuildShaderDescriptorInput,
} from './semantic/executors/materialStrategyExecutor'
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
  materialIntent: MaterialIntent
  activeTraits: string[]
}

export type ShaderMaterialDescriptor = VfxMaterialParams & {
  shaderFeatures: ShaderFeatureFlags
  geometryKind: EmitterPrimitiveGeometryKind
  polygonOffset: boolean
  polygonOffsetFactor: number
  polygonOffsetUnits: number
  /** Altura de clip no eixo Three Z (LoL Y). */
  groundClipZ: number | null
  softDepthFade: boolean
  distortionTextureUrl: string | null
  distortionTextureIsDds: boolean
  distortionStrength: number
}

/** @deprecated Usar placeholderColorForMaterialIntent — mantido para testes legados. */
export function resolveEmitterPlaceholderColor(_name: string): [number, number, number] {
  return [0.7, 0.7, 0.85]
}

export function buildShaderMaterialDescriptor(
  input: BuildShaderDescriptorInput,
): ShaderMaterialDescriptor {
  return executeMaterialStrategies(input)
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
  frame: Pick<
    VfxEmitterFrameState,
    'opacity' | 'color' | 'spriteOffset' | 'uvScroll' | 'uvRotation' | 'erosionDrive'
  >,
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
  pipeline?: ComposableRenderPipeline,
): VfxMaterialParams {
  const resolvedPipeline = pipeline ?? getComposablePipeline(emitter)
  return buildShaderMaterialDescriptor({
    emitter,
    frame,
    pipeline: resolvedPipeline,
    features: extractEmitterFeatures(emitter),
    textureUrl,
    textureIsDds,
    colorTextureUrl,
    colorTextureIsDds,
    textureMultUrl,
    textureMultIsDds,
    reflectionCubeUrl,
    reflectionCubeIsDds,
    paletteTextureUrl,
    paletteTextureIsDds,
    erosionTextureUrl: null,
    erosionTextureIsDds: false,
    distortionTextureUrl: null,
    distortionTextureIsDds: false,
    renderOptions,
  })
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
